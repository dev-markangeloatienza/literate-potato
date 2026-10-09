import { beforeEach, describe, expect, it, vi } from "vitest";
import { artifact, findSpeechModel } from "./speech-models";
import * as speech from "./speech";
const state = vi.hoisted(() => ({
  settings: new Map<string, unknown>(),
  files: new Map<string, { size: number; hash: string }>(),
  options: {} as { language?: string; translate?: boolean },
  path: "",
  release: vi.fn(),
  badHash: false,
  settingFailure: false,
}));
vi.mock("./storage", () => ({
  root: "file://app/",
  setting: async (key: string) => {
    if (state.settingFailure) throw new Error("Storage unavailable");
    return state.settings.get(key) ?? null;
  },
  setSetting: async (key: string, value: unknown) => {
    state.settings.set(key, value);
  },
}));
vi.mock("../modules/field-recorder", () => ({
  recorder: { sha256File: async (path: string) => state.files.get(path)?.hash },
}));
vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: async (path: string) => ({
    exists: state.files.has(path),
    size: state.files.get(path)?.size,
  }),
  makeDirectoryAsync: async () => {},
  getFreeDiskStorageAsync: async () => 2e9,
  moveAsync: async ({ from, to }: { from: string; to: string }) => {
    state.files.set(to, state.files.get(from)!);
    state.files.delete(from);
  },
  deleteAsync: async (path: string) => {
    state.files.delete(path);
  },
  createDownloadResumable: (url: string, path: string) => ({
    downloadAsync: async () => {
      const m = artifact(
        findSpeechModel(
          url.includes("tiny.en")
            ? "tiny.en"
            : url.includes("base")
              ? "base"
              : "tiny",
        ),
      );
      state.files.set(path, {
        size: m.bytes,
        hash: state.badHash ? "corrupt" : m.sha256,
      });
      return { status: 200 };
    },
    pauseAsync: async () => {},
  }),
}));
vi.mock("whisper.rn/index", () => ({
  initWhisper: async ({ filePath }: { filePath: string }) => {
    state.path = filePath;
    return {
      gpu: false,
      release: state.release,
      transcribe: (_audio: string, options: typeof state.options) => {
        state.options = options;
        return {
          stop: async () => {},
          promise: Promise.resolve({
            result: "May baha sa barangay.",
            isAborted: false,
          }),
        };
      },
    };
  },
}));
beforeEach(() => {
  state.settings.clear();
  state.files.clear();
  state.release.mockClear();
  state.badHash = false;
  state.settingFailure = false;
});
describe("local speech switching", () => {
  it("prepares multilingual tiny and transcribes without translation", async () => {
    await speech.prepare(() => {});
    await speech.selectLanguage("tl");
    expect(await speech.transcribe("local.wav", () => {})).toContain(
      "May baha",
    );
    expect(state.path).toBe("file://app/models/ggml-tiny.bin");
    expect(state.options).toMatchObject({ language: "tl", translate: false });
    expect(state.release).toHaveBeenCalledOnce();
  });
  it("keeps downloaded models and settings when switching", async () => {
    await speech.prepare(() => {});
    await speech.selectModel("base");
    expect(await speech.readiness()).toBe(false);
    await speech.prepare(() => {});
    await speech.selectModel("tiny");
    expect(await speech.readiness()).toBe(true);
    expect(await speech.readiness("base")).toBe(true);
    expect((await speech.selection()).model.id).toBe("tiny");
  });
  it("uses the existing English artifact and forces English", async () => {
    await speech.selectModel("tiny.en");
    await speech.selectLanguage("tl");
    await speech.prepare(() => {});
    await speech.transcribe("local.wav", () => {});
    expect(state.path).toBe("file://app/models/ggml-tiny.en.bin");
    expect(state.options.language).toBe("en");
  });
  it("rejects corruption and permits a fresh preparation", async () => {
    state.badHash = true;
    await expect(speech.prepare(() => {})).rejects.toThrow(
      "verification failed",
    );
    expect(state.files.size).toBe(0);
    state.badHash = false;
    await speech.prepare(() => {});
    expect(await speech.readiness()).toBe(true);
  });
  it("releases the busy state if reading model preferences fails", async () => {
    state.settingFailure = true;
    await expect(speech.prepare(() => {})).rejects.toThrow(
      "Storage unavailable",
    );
    state.settingFailure = false;
    await speech.prepare(() => {});
    expect(await speech.readiness()).toBe(true);
  });
  it("does not silently run another model when the selected one is missing", async () => {
    await speech.selectModel("tiny.en");
    await speech.prepare(() => {});
    await speech.selectModel("tiny");
    await expect(speech.transcribe("local.wav", () => {})).rejects.toThrow(
      "Prepare the speech model",
    );
    expect(await speech.readiness("tiny.en")).toBe(true);
  });
});
