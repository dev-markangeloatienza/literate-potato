import * as SQLite from "expo-sqlite";
import * as FS from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import { Draft, Report, Summary, validateReport } from "./domain";

export const root = FS.documentDirectory!;
let connection: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  connection ??= (async () => {
    const d = await SQLite.openDatabaseAsync("fieldbrief.db");
    await d.execAsync(
      `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS summaries (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
    );
    return d;
  })().catch((e) => {
    connection = undefined;
    throw e;
  });
  return connection;
}
export async function setting<T>(key: string): Promise<T | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key=?",
    key,
  );
  return row ? (JSON.parse(row.value) as T) : null;
}
export async function setSetting(key: string, value: unknown) {
  await (
    await db()
  ).runAsync(
    "INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)",
    key,
    JSON.stringify(value),
  );
}
export async function reports(): Promise<Report[]> {
  const rows = await (
    await db()
  ).getAllAsync<{ data: string }>("SELECT data FROM reports");
  return rows
    .map((r) => JSON.parse(r.data) as Report)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function summaries(): Promise<Summary[]> {
  const rows = await (
    await db()
  ).getAllAsync<{ data: string }>("SELECT data FROM summaries");
  return rows
    .map((r) => JSON.parse(r.data) as Summary)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function saveReport(r: Report) {
  validateReport(r);
  if (r.photo && !(await FS.getInfoAsync(r.photo)).exists)
    throw new Error("Photo is missing. Retake it before saving.");
  await (
    await db()
  ).withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      "INSERT OR REPLACE INTO reports(id,data) VALUES (?,?)",
      r.id,
      JSON.stringify(r),
    );
    await tx.runAsync("DELETE FROM settings WHERE key=?", "draft:" + r.id);
    const current = await tx.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key=?",
      "draft",
    );
    if (current && JSON.parse(current.value)?.id === r.id)
      await tx.runAsync("DELETE FROM settings WHERE key=?", "draft");
  });
}
export async function saveSummary(s: Summary) {
  await (
    await db()
  ).runAsync(
    "INSERT INTO summaries(id,data) VALUES (?,?)",
    s.id,
    JSON.stringify(s),
  );
}
export async function deleteReport(id: string) {
  await (await db()).runAsync("DELETE FROM reports WHERE id=?", id);
  // Snapshots remain immutable; orphan media is collected on next launch.
}
export function newDraft(): Draft {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    location: "",
    note: "",
    issue: "",
    follow_up: "",
    status: "Open",
    incident_type: "Unspecified",
    priority: "Unassessed",
    affected_people: "",
    hazards: "",
    needs: "",
    transcription_source: "typed",
    created_at: now,
    updated_at: now,
  };
}
export async function ownPhoto(uri: string) {
  const dir = root + "photos/";
  await FS.makeDirectoryAsync(dir, { intermediates: true });
  const original = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
  const resize =
    original.width >= original.height
      ? { width: Math.min(1600, original.width) }
      : { height: Math.min(1600, original.height) };
  const image = await manipulateAsync(original.uri, [{ resize }], {
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const thumb = await manipulateAsync(
    image.uri,
    [
      {
        resize: image.width >= image.height ? { width: 240 } : { height: 240 },
      },
    ],
    { compress: 0.65, format: SaveFormat.JPEG },
  );
  const id = randomUUID();
  const photo = `${dir}${id}.jpg`;
  const thumbnail = `${dir}${id}-thumb.jpg`;
  try {
    await FS.copyAsync({ from: image.uri, to: photo });
    await FS.copyAsync({ from: thumb.uri, to: thumbnail });
  } catch (e) {
    await FS.deleteAsync(photo, { idempotent: true });
    await FS.deleteAsync(thumbnail, { idempotent: true });
    throw e;
  } finally {
    for (const temporary of [original.uri, image.uri, thumb.uri])
      await FS.deleteAsync(temporary, { idempotent: true }).catch(() => {});
  }
  return { photo, thumbnail };
}
export async function collectOrphans() {
  const all = await reports();
  const rows = await (
    await db()
  ).getAllAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key='draft' OR key LIKE 'draft:%'",
  );
  const drafts = rows
    .map((r) => JSON.parse(r.value) as Draft | null)
    .filter((r): r is Draft => !!r);
  const keep = new Set(
    [...all, ...drafts].flatMap((r) => [r.photo, r.thumbnail]),
  );
  drafts.forEach((d) => {
    if (d.audio) keep.add(d.audio);
  });
  for (const folder of ["photos/", "audio/"]) {
    const dir = root + folder;
    await FS.makeDirectoryAsync(dir, { intermediates: true });
    for (const name of await FS.readDirectoryAsync(dir)) {
      const uri = dir + name;
      if (!keep.has(uri)) await FS.deleteAsync(uri, { idempotent: true });
    }
  }
}
