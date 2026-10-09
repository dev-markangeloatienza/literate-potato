import { beforeEach, describe, expect, it, vi } from "vitest";
import * as extraction from "./extraction";
const state = vi.hoisted(() => ({
  files: new Map<string, { size: number; hash: string }>(),
  release: vi.fn(),
  stop: vi.fn(),
  init: vi.fn(),
  output:
    '{"affected_people":[{"sentence":1,"quote":"12 families"}],"hazards":[],"needs":[]}',
  limit: 0,
  failLoad: false,
  corruptDownload: false,
  tokens: 10,
  duringLoad: undefined as undefined | (() => Promise<void>),
  options: {} as Record<string, unknown>,
}));
vi.mock("./storage", () => ({ root: "file://app/" }));
vi.mock("../modules/field-recorder", () => ({
  recorder: {
    sha256File: async (path: string) => state.files.get(path)?.hash,
  },
}));
vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: async (path: string) => ({
    exists: state.files.has(path),
    size: state.files.get(path)?.size,
  }),
  makeDirectoryAsync: async () => {},
  getFreeDiskStorageAsync: async () => 2e9,
  deleteAsync: async (path: string) => {
    state.files.delete(path);
  },
  moveAsync: async ({ from, to }: { from: string; to: string }) => {
    state.files.set(to, state.files.get(from)!);
    state.files.delete(from);
  },
  createDownloadResumable: (_url: string, path: string) => ({
    downloadAsync: async () => {
      state.files.set(path, {
        size: extraction.extractionModel.bytes,
        hash: state.corruptDownload ? "bad" : extraction.extractionModel.sha256,
      });
      return { status: 200 };
    },
    pauseAsync: async () => {},
  }),
}));
vi.mock("llama.rn", () => ({
  toggleNativeLog: async () => {},
  initLlama: async (options: Record<string, unknown>) => {
    state.init(options);
    if (state.failLoad) throw new Error("Load failed");
    await state.duringLoad?.();
    return {
      tokenize: async () => ({ tokens: Array(state.tokens).fill(1) }),
      completion: async (params: Record<string, unknown>) => {
        state.options = params;
        return {
          text: state.output,
          stopped_limit: state.limit,
          truncated: false,
        };
      },
      release: state.release,
      stopCompletion: state.stop,
    };
  },
}));
beforeEach(() => {
  state.files.clear();
  state.release.mockClear();
  state.stop.mockClear();
  state.init.mockClear();
  state.failLoad = false;
  state.limit = 0;
  state.tokens = 10;
  state.corruptDownload = false;
  state.duringLoad = undefined;
  state.output =
    '{"affected_people":[{"sentence":1,"quote":"12 families"}],"hazards":[],"needs":[]}';
});
describe("local extraction lifecycle", () => {
  it("requires explicit preparation and never fabricates a fallback", async () => {
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "Download",
    );
    expect(state.init).not.toHaveBeenCalled();
    await extraction.prepare(() => {});
    expect(await extraction.readiness()).toBe(true);
  });
  it("uses CPU and constrained output then releases the model", async () => {
    await extraction.prepare(() => {});
    expect(await extraction.extract("12 families affected.")).toEqual({
      affected_people: ["12 families"],
      hazards: [],
      needs: [],
    });
    expect(state.init).toHaveBeenCalledWith(
      expect.objectContaining({ n_gpu_layers: 0, n_threads: 4 }),
    );
    expect(state.options).toMatchObject({
      temperature: 0,
      response_format: { type: "json_schema" },
    });
    expect(state.release).toHaveBeenCalledOnce();
  });
  it("rejects a corrupt model before loading and removes corrupt downloads", async () => {
    state.corruptDownload = true;
    await expect(extraction.prepare(() => {})).rejects.toThrow("verification");
    expect(state.files.size).toBe(0);
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "Download",
    );
    expect(state.init).not.toHaveBeenCalled();
  });
  it("releases and permits retry after ungrounded or incomplete results", async () => {
    await extraction.prepare(() => {});
    state.output = '{"affected_people":["12 people"],"hazards":[],"needs":[]}';
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "match",
    );
    state.output = '{"affected_people":[],"hazards":[],"needs":[]}';
    state.limit = 768;
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "incomplete",
    );
    state.limit = 0;
    await expect(extraction.extract("Road clear.")).resolves.toMatchObject({
      hazards: [],
    });
    expect(state.release).toHaveBeenCalledTimes(3);
  });
  it("cancellation during model loading discards results and releases", async () => {
    await extraction.prepare(() => {});
    state.duringLoad = extraction.cancel;
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "cancelled",
    );
    expect(state.release).toHaveBeenCalledOnce();
    state.duringLoad = undefined;
    await expect(
      extraction.extract("12 families affected."),
    ).resolves.toBeDefined();
  });
  it("load failures and context limits do not leave extraction locked", async () => {
    await extraction.prepare(() => {});
    state.failLoad = true;
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "Load",
    );
    state.failLoad = false;
    state.tokens = 4000;
    await expect(extraction.extract("12 families affected.")).rejects.toThrow(
      "context",
    );
    state.tokens = 10;
    await expect(
      extraction.extract("12 families affected."),
    ).resolves.toBeDefined();
  });
});
