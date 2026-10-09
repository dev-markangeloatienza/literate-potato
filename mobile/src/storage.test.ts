import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Report, Draft } from "./domain";
import * as store from "./storage";
import { compile } from "./domain";
import { randomUUID } from "node:crypto";

const files = vi.hoisted(() => new Set<string>());
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file://app/",
  getInfoAsync: async (uri: string) => ({ exists: files.has(uri) }),
  makeDirectoryAsync: async () => {},
  readDirectoryAsync: async (dir: string) =>
    [...files].filter((f) => f.startsWith(dir)).map((f) => f.slice(dir.length)),
  deleteAsync: async (uri: string) => {
    files.delete(uri);
  },
}));
vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: vi.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));
vi.mock("expo-crypto", async () => {
  const { randomUUID } = await import("node:crypto");
  return { randomUUID };
});
vi.mock("expo-sqlite", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(":memory:");
  const adapter = {
    execAsync: async (sql: string) => {
      database.exec(sql);
    },
    runAsync: async (sql: string, ...args: (string | number)[]) =>
      database.prepare(sql).run(...args),
    getFirstAsync: async (sql: string, ...args: (string | number)[]) =>
      database.prepare(sql).get(...args),
    getAllAsync: async (sql: string, ...args: (string | number)[]) =>
      database.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async (
      fn: (tx: unknown) => Promise<void>,
    ) => {
      database.exec("BEGIN");
      try {
        await fn(adapter);
        database.exec("COMMIT");
      } catch (e) {
        database.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { openDatabaseAsync: async () => adapter };
});
const report: Report = {
  id: "a",
  location: "Level 1",
  note: "Cracked tile",
  issue: "",
  follow_up: "",
  status: "Open",
  transcription_source: "typed",
  created_at: "2026-10-10",
  updated_at: "2026-10-10",
};
describe("SQLite durability and media ownership", () => {
  beforeEach(async () => {
    files.clear();
    for (const r of await store.reports()) await store.deleteReport(r.id);
    await store.setSetting("draft", null);
    await store.setSetting("draft:a", null);
  });
  it("does not confirm a report whose photo is missing; preserves recovery", async () => {
    const draft = { ...report, photo: "file://app/photos/missing.jpg" };
    await store.setSetting("draft", draft);
    await expect(store.saveReport(draft)).rejects.toThrow("Photo is missing");
    expect(await store.reports()).toEqual([]);
    expect(await store.setting("draft")).toEqual(draft);
  });
  it("saves report and clears only its own draft", async () => {
    await store.setSetting("draft", report);
    await store.saveReport(report);
    expect(await store.reports()).toEqual([report]);
    expect(await store.setting("draft")).toBeNull();
  });
  it("round-trips incident metadata and preserves it in recovered drafts", async () => {
    const incident: Report = {
      ...report,
      incident_type: "Flooding",
      priority: "Urgent",
      needs: "Water",
      affected_people: "12 families",
      hazards: "Debris",
      coordinates: {
        latitude: 14.6,
        longitude: 121,
        accuracy: null,
        captured_at: "2026-10-10T01:00:00Z",
      },
    };
    await store.setSetting("draft", incident);
    expect(await store.setting("draft")).toEqual(incident);
    await store.saveReport(incident);
    expect((await store.reports())[0]).toEqual(incident);
  });
  it("editing one report cannot clear another capture draft", async () => {
    const other = { ...report, id: "b" };
    await store.setSetting("draft", other);
    await store.setSetting("draft:a", report);
    await store.saveReport(report);
    expect(await store.setting("draft")).toEqual(other);
    expect(await store.setting("draft:a")).toBeNull();
  });
  it("recovers pending extraction without changing manually entered fields or audio", async () => {
    const draft: Draft = {
      ...report,
      affected_people: "Responder confirmed two families",
      audio: "file://app/audio/retry.wav",
      extraction_review: {
        transcript: report.note,
        suggestions: { affected_people: [], hazards: [report.note], needs: [] },
      },
    };
    await store.setSetting("draft:a", draft);
    await store.collectOrphans();
    const recovered = await store.setting<Draft>("draft:a");
    expect(recovered).toEqual(draft);
    expect(await store.reports()).toEqual([]);
  });
  it("preserves source-linked immutable snapshots after source deletion", async () => {
    await store.saveReport(report);
    const snapshot = compile([report], randomUUID(), "now");
    await store.saveSummary(snapshot);
    await store.deleteReport(report.id);
    expect(await store.reports()).toEqual([]);
    expect((await store.summaries()).find((s) => s.id === snapshot.id)).toEqual(
      snapshot,
    );
  });
  it("binds untrusted text as data", async () => {
    const r = { ...report, note: "'); DROP TABLE reports; --" };
    await store.saveReport(r);
    expect((await store.reports())[0].note).toBe(r.note);
  });
  it("cleans orphan files but retains report and recovered edit media", async () => {
    const photo = "file://app/photos/kept.jpg";
    files.add(photo);
    files.add("file://app/photos/orphan.jpg");
    const audio = "file://app/audio/retry.wav";
    files.add(audio);
    await store.saveReport({ ...report, photo });
    await store.setSetting("draft:a", { ...report, audio } satisfies Draft);
    await store.collectOrphans();
    expect(files.has(photo)).toBe(true);
    expect(files.has(audio)).toBe(true);
    expect(files.has("file://app/photos/orphan.jpg")).toBe(false);
  });
});
