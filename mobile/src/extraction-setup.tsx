import React, { useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import * as extraction from "./extraction";
import { Button, Busy, Notice, styles } from "./ui";

export function ExtractionSetup({
  disabled,
  onBusy,
}: {
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState("Checking extraction model…");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [checkText, setCheckText] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    onBusy(!!busy);
  }, [busy, onBusy]);
  useEffect(() => {
    alive.current = true;
    void extraction
      .readiness()
      .then((r) => {
        if (alive.current) setReady(r);
      })
      .catch(() => {
        if (alive.current)
          setError("Could not verify extraction files. Retry preparation.");
      })
      .finally(() => {
        if (alive.current) setBusy("");
      });
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void extraction.cancel();
    });
    return () => {
      alive.current = false;
      sub.remove();
      void extraction.cancel();
    };
  }, []);
  async function prepare() {
    setBusy("Downloading / verifying extraction model…");
    setError("");
    setProgress(0);
    try {
      await extraction.prepare((n) => {
        if (alive.current) setProgress(n);
      });
      if (alive.current) setReady(true);
    } catch (e) {
      if (alive.current) {
        setReady(false);
        setError(e instanceof Error ? e.message : "Preparation failed. Retry.");
      }
    } finally {
      if (alive.current) setBusy("");
    }
  }
  async function check(kind: "taglish" | "negation" | "unknown" = "taglish") {
    const sample = {
      taglish:
        "May 12 pamilya na apektado. Tumataas ang baha malapit sa tulay. Kailangan ng pagkain at rescue boat.",
      negation:
        "No one is injured. The road is no longer flooded. We do not need a rescue boat; we need drinking water.",
      unknown: "The responder arrived at the barangay office at noon.",
    }[kind];
    setBusy("Running local extraction check…");
    setError("");
    setCheckText("");
    const start = Date.now();
    try {
      const result = await extraction.extract(sample);
      if (alive.current)
        setCheckText(
          `Test observation: ${sample}\n${((Date.now() - start) / 1000).toFixed(1)} seconds\nAffected people: ${result.affected_people.join("; ") || "No suggestion"}\nHazards: ${result.hazards.join("; ") || "No suggestion"}\nNeeds: ${result.needs.join("; ") || "No suggestion"}`,
        );
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Extraction check failed.");
    } finally {
      if (alive.current) setBusy("");
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Incident details from your observation</Text>
      <Text style={styles.body}>
        Qwen3 0.6B · 429 MB · {ready ? "Verified" : "Not ready"}. Allow 888 MB
        free for preparation. Download once while connected. Extraction then
        runs on this phone, including offline.
      </Text>
      <Text style={styles.body}>
        After transcription, review suggestions for affected people, hazards and
        requested needs. Unknown details stay blank. Suggestions can misclassify
        excerpts; verify numbers, negations and Taglish wording.
      </Text>
      {busy && (
        <Busy
          text={
            busy +
            (busy.startsWith("Downloading")
              ? ` ${Math.round(progress * 100)}%`
              : "")
          }
        />
      )}
      {error && <Notice text={error} error />}
      <Button
        title={
          ready
            ? "Verify / repair extraction model"
            : "Download extraction model"
        }
        icon="download-outline"
        disabled={disabled || !!busy}
        onPress={() => void prepare()}
      />
      {busy.startsWith("Downloading") && (
        <Button
          title="Cancel extraction download"
          secondary
          onPress={() => {
            setBusy("Cancelling extraction download…");
            void extraction.cancel();
          }}
        />
      )}
      <Text style={styles.label}>Local extraction check · test content</Text>
      <Text style={styles.body}>
        Sample: May 12 pamilya na apektado. Tumataas ang baha malapit sa tulay.
        Kailangan ng pagkain at rescue boat. This checks a typed Taglish sample;
        it does not test microphone accuracy or create a report.
      </Text>
      <Button
        title="Run local extraction check"
        secondary
        disabled={!ready || disabled || !!busy}
        onPress={() => void check()}
      />
      <Button
        title="Check negated statements"
        secondary
        disabled={!ready || disabled || !!busy}
        onPress={() => void check("negation")}
      />
      <Button
        title="Check unknown details"
        secondary
        disabled={!ready || disabled || !!busy}
        onPress={() => void check("unknown")}
      />
      {busy.startsWith("Running") && (
        <Button
          title="Cancel extraction check"
          secondary
          onPress={() => {
            setBusy("Cancelling extraction check…");
            void extraction.cancel();
          }}
        />
      )}
      {!!checkText && (
        <Text selectable style={styles.body}>
          {checkText}
        </Text>
      )}
      <Text selectable style={styles.body}>
        Typing and recording remain available without this model. No cloud
        fallback.
      </Text>
    </View>
  );
}
