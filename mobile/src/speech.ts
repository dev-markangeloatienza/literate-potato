import * as FS from "expo-file-system/legacy";
import { recorder } from "../modules/field-recorder";
import { root, setSetting } from "./storage";
import type { WhisperContext } from "whisper.rn/index";

export const model = {
  name: "Whisper tiny.en",
  bytes: 77704715,
  sha256: "921e4cf8686fdd993dcd081a5da5b6c365bfde1162e72b08d75ac75289920b1f",
  revision: "5359861c739e955e79d9a303bcbc70fb988958b1",
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.en.bin",
};
const path = root + "models/ggml-tiny.en.bin";
let context: WhisperContext | null = null;
let download: FS.DownloadResumable | null = null;
let busy = false;
let cancelRun: (() => Promise<void>) | null = null;
let cancelled = false;
let preparationCancelled = false;
export async function readiness() {
  const info = await FS.getInfoAsync(path);
  if (!info.exists || info.size !== model.bytes) return false;
  if (!recorder)
    throw new Error("Local speech requires an Android native build.");
  // Streaming native SHA-256 runs off the JS/UI thread with bounded memory.
  return (await recorder.sha256File(path)) === model.sha256;
}
export async function prepare(onProgress: (n: number) => void) {
  if (busy || download) throw new Error("Local speech is already busy.");
  busy = true;
  preparationCancelled = false;
  const temporary = path + ".part";
  try {
    if (!recorder)
      throw new Error("Local speech requires an Android native build.");
    if (await readiness()) return;
    if (preparationCancelled) throw new Error("Preparation cancelled.");
    await FS.makeDirectoryAsync(root + "models/", { intermediates: true });
    const free = await FS.getFreeDiskStorageAsync();
    if (free < model.bytes * 2 + 30_000_000)
      throw new Error("Free at least 190 MB of storage, then retry.");
    download = FS.createDownloadResumable(model.url, temporary, {}, (p) =>
      onProgress(p.totalBytesWritten / model.bytes),
    );
    const result = await download.downloadAsync();
    if (preparationCancelled || !result || result.status !== 200)
      throw new Error(
        "Download cancelled or unsuccessful. Retry when connected.",
      );
    await FS.moveAsync({ from: temporary, to: path });
    if (!(await readiness())) {
      await FS.deleteAsync(path, { idempotent: true });
      throw new Error("Model verification failed. Download again.");
    }
    if (preparationCancelled) throw new Error("Preparation cancelled.");
    await setSetting("speech-model", {
      ...model,
      path,
      verified_at: new Date().toISOString(),
      backend: "CPU",
    });
  } finally {
    download = null;
    busy = false;
    await FS.deleteAsync(temporary, { idempotent: true });
  }
}
export async function cancel() {
  preparationCancelled = true;
  cancelled = true;
  if (download) await download.pauseAsync().catch(() => {});
  if (cancelRun) await cancelRun().catch(() => {});
}
export async function transcribe(
  audio: string,
  onProgress: (n: number) => void,
  kind: "recording" | "bundled_check" = "recording",
) {
  if (busy || download) throw new Error("Local speech is already busy.");
  busy = true;
  cancelled = false;
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const verificationStarted = Date.now();
    if (!(await readiness()))
      throw new Error(
        "Prepare the speech model in Local AI first. You can still type your note.",
      );
    if (cancelled) throw new Error("Transcription cancelled.");
    const verificationMs = Date.now() - verificationStarted;
    const loadStarted = Date.now();
    const { initWhisper } = await import("whisper.rn/index");
    context = await initWhisper({
      filePath: path,
      useGpu: false,
      useCoreMLIos: false,
    });
    if (cancelled) throw new Error("Transcription cancelled.");
    const loadMs = Date.now() - loadStarted;
    const inferenceStarted = Date.now();
    const task = context.transcribe(audio, {
      language: "en",
      maxThreads: 4,
      onProgress,
    });
    cancelRun = task.stop;
    timer = setTimeout(() => {
      cancelled = true;
      void task.stop();
    }, 90_000);
    const result = await task.promise;
    if (cancelled || result.isAborted)
      throw new Error(
        "Transcription cancelled or timed out. Audio is retained for retry.",
      );
    if (!result.result.trim())
      throw new Error("No speech recognized. Retry or type the observation.");
    await setSetting("speech-benchmark", {
      elapsed_ms: Date.now() - started,
      at: new Date().toISOString(),
      backend: context.gpu ? "GPU" : "CPU",
      model: model.name,
      kind,
      verification_ms: verificationMs,
      load_ms: loadMs,
      inference_ms: Date.now() - inferenceStarted,
    });
    return result.result.trim();
  } finally {
    if (timer) clearTimeout(timer);
    cancelRun = null;
    try {
      await context?.release();
    } finally {
      context = null;
      busy = false;
    }
  }
}
