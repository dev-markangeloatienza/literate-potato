import * as FS from "expo-file-system/legacy";
import { recorder } from "../modules/field-recorder";
import { root } from "./storage";
import type { LlamaContext } from "llama.rn";
import {
  extractionPrompt,
  extractionSchema,
  parseSuggestions,
} from "./extraction-domain";

export const extractionModel = {
  name: "Qwen3 0.6B",
  file: "Qwen3-0.6B-Q4_0.gguf",
  bytes: 428970080,
  sha256: "da2572f16c06133561ce56accaa822216f2391ef4d37fba427801cd6736417d4",
  url: "https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/b5f37287796e5be0ea3dab2e7430873fb3f73e49/Qwen3-0.6B-Q4_0.gguf",
};
const path = root + "models/" + extractionModel.file;
let busy = false;
let cancelled = false;
let context: LlamaContext | null = null;
let download: FS.DownloadResumable | null = null;
function checkCancelled() {
  if (cancelled)
    throw new Error(
      "Extraction cancelled or timed out. Your transcript is retained.",
    );
}
async function verified(file: string) {
  const info = await FS.getInfoAsync(file);
  if (!info.exists || info.size !== extractionModel.bytes) return false;
  if (!recorder)
    throw new Error("Local extraction requires the Android native app.");
  return (await recorder.sha256File(file)) === extractionModel.sha256;
}
export async function readiness() {
  return verified(path);
}
export async function cancel() {
  cancelled = true;
  await download?.pauseAsync().catch(() => {});
  await context?.stopCompletion().catch(() => {});
}
export async function prepare(onProgress: (n: number) => void) {
  if (busy) throw new Error("Local extraction is already busy.");
  busy = true;
  cancelled = false;
  const temporary = path + ".part";
  try {
    if (!recorder)
      throw new Error("Local extraction requires the Android native app.");
    if (await readiness()) {
      checkCancelled();
      return;
    }
    checkCancelled();
    await FS.makeDirectoryAsync(root + "models/", { intermediates: true });
    if (
      (await FS.getFreeDiskStorageAsync()) <
      extractionModel.bytes * 2 + 30_000_000
    )
      throw new Error("Free at least 888 MB of storage, then retry.");
    checkCancelled();
    download = FS.createDownloadResumable(
      extractionModel.url,
      temporary,
      {},
      (p) =>
        onProgress(Math.min(1, p.totalBytesWritten / extractionModel.bytes)),
    );
    const result = await download.downloadAsync();
    checkCancelled();
    if (!result || result.status !== 200)
      throw new Error("Download failed. Retry when connected.");
    if (!(await verified(temporary)))
      throw new Error("Extraction model verification failed. Download again.");
    checkCancelled();
    await FS.moveAsync({ from: temporary, to: path });
  } finally {
    download = null;
    try {
      await FS.deleteAsync(temporary, { idempotent: true });
    } finally {
      busy = false;
    }
  }
}
export async function extract(transcript: string) {
  if (busy) throw new Error("Local extraction is already busy.");
  if (!transcript.trim())
    throw new Error("Add or transcribe an observation first.");
  if (transcript.length > 6000)
    throw new Error(
      "Observation is too long for local extraction. Enter incident details manually.",
    );
  busy = true;
  cancelled = false;
  const timer = setTimeout(() => void cancel(), 90_000);
  try {
    if (!(await readiness()))
      throw new Error(
        "Transcript retained. Download the extraction model in Local AI, then tap Suggest incident details.",
      );
    checkCancelled();
    const { initLlama, toggleNativeLog } = await import("llama.rn");
    await toggleNativeLog(false);
    checkCancelled();
    context = await initLlama({
      model: path,
      n_ctx: 4096,
      n_threads: 4,
      n_gpu_layers: 0,
      use_mlock: false,
    });
    checkCancelled();
    const prompt = extractionPrompt(transcript);
    const tokens = await context.tokenize(prompt);
    if (tokens.tokens.length > 4096 - 768 - 64)
      throw new Error(
        "Observation exceeds the extraction context. Enter incident details manually.",
      );
    checkCancelled();
    const result = await context.completion({
      prompt,
      n_predict: 768,
      temperature: 0,
      seed: 42,
      response_format: {
        type: "json_schema",
        json_schema: { strict: true, schema: extractionSchema(transcript) },
      },
    });
    checkCancelled();
    if (
      result.truncated ||
      result.stopped_limit ||
      result.context_full ||
      result.interrupted
    )
      throw new Error(
        "Extraction was incomplete. Retry or enter incident details manually.",
      );
    return parseSuggestions(result.text.trim(), transcript);
  } finally {
    clearTimeout(timer);
    try {
      await context?.release();
    } finally {
      context = null;
      busy = false;
    }
  }
}
