import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as FS from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import * as speech from "../speech";
import { setting } from "../storage";
import { Button, Busy, Notice, styles, colors } from "../ui";
import { router } from "expo-router";
import { ExtractionSetup } from "../extraction-setup";
import {
  artifact,
  speechModels,
  speechLanguages,
  SpeechLanguage,
  SpeechModelId,
} from "../speech-models";
export default function Setup() {
  const [extractionBusy, setExtractionBusy] = useState(false);
  const [model, setModel] = useState(artifact(speechModels[0]));
  const [language, setLanguage] = useState<SpeechLanguage>("auto");
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState("Checking local model…"),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [checkText, setCheckText] = useState(""),
    [free, setFree] = useState(0),
    [benchmark, setBenchmark] = useState<{
      elapsed_ms: number;
      at: string;
      kind?: string;
      model?: string;
    } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      speech.selection(),
      FS.getFreeDiskStorageAsync(),
      setting<{ elapsed_ms: number; at: string; kind?: string }>(
        "speech-benchmark",
      ),
    ])
      .then(async ([selection, f, b]) => {
        const r = await speech.readiness(selection.model.id);
        if (alive) {
          setModel(selection.model);
          setLanguage(selection.language);
          setReady(r);
          setFree(f);
          setBenchmark(b);
        }
      })
      .catch(() => {
        if (alive) setError("Could not verify local files. Retry preparation.");
      })
      .finally(() => {
        if (alive) setBusy("");
      });
    return () => {
      alive = false;
      void speech.cancel();
    };
  }, []);
  async function switchModel(id: SpeechModelId) {
    setBusy("Checking selected model…");
    setError("");
    setCheckText("");
    try {
      await speech.selectModel(id);
      setModel((await speech.selection()).model);
      setReady(await speech.readiness(id));
    } catch (e) {
      setReady(false);
      setError(e instanceof Error ? e.message : "Could not switch model.");
    } finally {
      setBusy("");
    }
  }
  async function switchLanguage(value: SpeechLanguage) {
    setBusy("Saving speech language…");
    setError("");
    try {
      await speech.selectLanguage(value);
      setLanguage(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change language.");
    } finally {
      setBusy("");
    }
  }
  async function prepare() {
    setBusy("Downloading and verifying…");
    setError("");
    setProgress(0);
    try {
      await speech.prepare(setProgress);
      setReady(true);
    } catch (e) {
      setReady(await speech.readiness().catch(() => false));
      setError(e instanceof Error ? e.message : "Preparation failed. Retry.");
    } finally {
      setBusy("");
    }
  }
  async function check() {
    setBusy("Running local speech check…");
    setProgress(0);
    setError("");
    setCheckText("");
    try {
      const asset = Asset.fromModule(require("../../assets/speech-check.wav"));
      await asset.downloadAsync();
      if (!asset.localUri)
        throw new Error("Bundled speech check is unavailable.");
      setCheckText(
        await speech.transcribe(asset.localUri, setProgress, "bundled_check"),
      );
      setBenchmark(
        await setting<{ elapsed_ms: number; at: string; kind?: string }>(
          "speech-benchmark",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speech check failed.");
    } finally {
      setBusy("");
    }
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Prepared once. Available offline.</Text>
      <Text style={styles.title}>AI on your phone</Text>
      <Button
        title="Back to reports"
        secondary
        icon="arrow-back"
        onPress={() => router.replace("/")}
      />
      <Text style={styles.body}>
        Choose and download a speech model while connected. After verification,
        audio is processed locally using native whisper.cpp on CPU.
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Speech model</Text>
        {speechModels.map((m) => (
          <View key={m.id} style={{ gap: 8 }}>
            <Button
              title={`${model.id === m.id ? "Selected · " : ""}${m.name} · ${(m.bytes / 1e6).toFixed(1)} MB`}
              secondary
              disabled={extractionBusy || !!busy || model.id === m.id}
              onPress={() => void switchModel(m.id)}
            />
            <Text style={styles.body}>{m.description}</Text>
          </View>
        ))}
        <Text style={styles.body}>
          Downloaded models are kept separately. Switching does not download
          automatically. Prepare the selected model before going offline.
        </Text>
        <Text style={styles.label}>Spoken language</Text>
        {speechLanguages.map((value) => (
          <Button
            key={value}
            title={`${language === value ? "Selected · " : ""}${value === "auto" ? "Auto-detect" : value === "tl" ? "Filipino / Taglish" : "English"}`}
            secondary
            disabled={
              extractionBusy ||
              !!busy ||
              !model.multilingual ||
              language === value
            }
            onPress={() => void switchLanguage(value)}
          />
        ))}
        <Text style={styles.body}>
          {model.multilingual
            ? "Taglish accuracy is unverified. Compare models with your own recordings and review names, numbers and needs."
            : "English-only model always uses English. Your multilingual language preference is retained."}
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: colors.ink,
              flex: 1,
            }}
          >
            {model.name}
          </Text>
          <Text style={styles.label}>{ready ? "Verified" : "Not ready"}</Text>
        </View>
        <Text style={styles.body}>
          {(model.bytes / 1e6).toFixed(1)} MB ·{" "}
          {model.multilingual ? "Multilingual" : "English"} · GGML · unquantized
        </Text>
        <Text style={styles.body}>
          Available storage: {(free / 1e9).toFixed(1)} GB. Allow at least{" "}
          {Math.ceil((model.bytes * 2 + 30_000_000) / 1e6)} MB for preparation.
        </Text>
        {busy && (
          <Busy
            text={
              busy +
              (progress ? ` ${Math.min(100, Math.round(progress * 100))}%` : "")
            }
          />
        )}
        <Button
          title={ready ? "Verify / repair model" : "Download speech model"}
          disabled={extractionBusy || !!busy}
          icon="download-outline"
          onPress={() => void prepare()}
        />
        {busy.startsWith("Downloading") && (
          <Button
            title="Cancel download"
            secondary
            onPress={() => {
              setBusy("Cancelling download…");
              void speech.cancel();
            }}
          />
        )}
      </View>
      {error && <Notice text={error} error />}
      <ExtractionSetup
        disabled={extractionBusy || !!busy}
        onBusy={setExtractionBusy}
      />
      <View style={styles.card}>
        <Text style={styles.label}>Verify native speech</Text>
        <Text style={styles.body}>
          Run an 11-second bundled English recording through the real local
          model. This is an English runtime check, not a Taglish accuracy test,
          separate from your observations.
        </Text>
        <Button
          title="Run local speech check"
          secondary
          disabled={!ready || extractionBusy || !!busy}
          onPress={() => void check()}
        />
        {busy.startsWith("Running") && (
          <Button
            title="Cancel speech check"
            secondary
            onPress={() => {
              setBusy("Cancelling local speech…");
              void speech.cancel();
            }}
          />
        )}{" "}
        {!!checkText && (
          <Text selectable style={styles.body}>
            {checkText}
          </Text>
        )}
      </View>
      <Notice text="Typing, photos and compiled handover work even when the model is unavailable. There is no cloud transcription fallback." />
      <View style={styles.card}>
        <Text style={styles.label}>Latest phone measurement</Text>
        <Text style={styles.body}>
          {benchmark
            ? `${(benchmark.elapsed_ms / 1000).toFixed(1)} seconds · ${benchmark.model || "Previous model"} · CPU · ${benchmark.kind === "bundled_check" ? "Bundled check" : "Recording"} · ${new Date(benchmark.at).toLocaleString()}`
            : "No transcription measured on this installation yet."}
        </Text>
        <Text style={styles.body}>
          Timings are observations, not a performance guarantee. Test a
          10-second note in airplane mode.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Your data & tools</Text>
        <Text style={styles.body}>
          Reports and snapshots use SQLite. Photos, WAV recordings and the
          speech model use app-owned storage. No accounts, uploads or analytics.
        </Text>
        <Text style={styles.body}>
          App data is not backed up. Uninstalling or clearing app storage
          removes reports and model files.
        </Text>
        <Text style={styles.body}>
          Whisper (MIT), whisper.cpp (MIT), whisper.rn (MIT), Expo / React
          Native, SQLite. Qwen3 (Apache 2.0), llama.cpp and llama.rn (MIT)
          provide local incident extraction. Built with Codex. Photo
          interpretation is not included.
        </Text>
        <Text
          selectable
          style={{ fontSize: 11, lineHeight: 17, color: colors.muted }}
        >
          Artifact SHA-256: {model.sha256}
        </Text>
      </View>
    </ScrollView>
  );
}
