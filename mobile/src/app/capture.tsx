import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as Picker from "expo-image-picker";
import { requestRecordingPermissionsAsync } from "expo-audio";
import * as FS from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
import { Draft, statuses, incidentTypes, priorities } from "../domain";
import * as Location from "expo-location";
import * as store from "../storage";
import * as speech from "../speech";
import * as extraction from "../extraction";
import {
  autoFillIncidentFields,
  editIncidentDraft,
} from "../incident-autofill";
import { recorder } from "../../modules/field-recorder";
import { Button, Busy, Field, Notice, styles, colors } from "../ui";

export default function Capture() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const [draft, setDraft] = useState<Draft | null>(null),
    [error, setError] = useState(""),
    [recovered, setRecovered] = useState(false),
    [busy, setBusy] = useState(""),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [progress, setProgress] = useState(0),
    [recent, setRecent] = useState<string[]>([]);
  const [speechLabel, setSpeechLabel] = useState("");
  const latest = useRef<Draft | null>(null),
    dirty = useRef(false),
    leaving = useRef(false),
    recordingRef = useRef(false),
    operation = useRef({ generation: 0 }),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const [rows, selected] = await Promise.all([
        store.reports(),
        speech.selection(),
      ]);
      if (active) setSpeechLabel(selected.model.name);
      setRecent([...new Set(rows.map((r) => r.location))].slice(0, 5));
      const saved = await store.setting<Draft>(id ? "draft:" + id : "draft");
      let value: Draft;
      if (id) {
        const report = rows.find((r) => r.id === id);
        if (!report) throw new Error("This source report is unavailable.");
        value = saved || report;
        setRecovered(!!saved);
      } else {
        value = saved || store.newDraft();
        setRecovered(!!saved);
      }
      if (value.extraction_review?.transcript === value.note) {
        value = autoFillIncidentFields(
          value,
          value.extraction_review.suggestions,
        );
        await store.setSetting(id ? "draft:" + id : "draft", value);
      }
      if (active) {
        latest.current = value;
        setDraft(value);
      }
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [id]);
  async function captureLocation() {
    setError("");
    setBusy("Finding GPS location…");
    let subscription: Location.LocationSubscription | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Location access is off",
          "Enter the barangay and landmark manually. You can enable location in Settings.",
          [
            { text: "OK" },
            { text: "Settings", onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      if (!(await Location.hasServicesEnabledAsync()))
        throw new Error(
          "Turn on device location or enter the location manually.",
        );
      const fix = await new Promise<Location.LocationObject>(
        (resolve, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "No GPS fix within 20 seconds. Try outdoors or enter a location manually.",
                ),
              ),
            20000,
          );
          void Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              mayShowUserSettingsDialog: false,
            },
            resolve,
          ).then((sub) => {
            subscription = sub;
            if (finished || !mounted.current) sub.remove();
          }, reject);
        },
      );
      if (mounted.current)
        update({
          coordinates: {
            latitude: fix.coords.latitude,
            longitude: fix.coords.longitude,
            accuracy: fix.coords.accuracy,
            captured_at: new Date(fix.timestamp).toISOString(),
          },
        });
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "GPS unavailable. Enter a location manually.",
        );
    } finally {
      finished = true;
      if (timeout) clearTimeout(timeout);
      subscription?.remove();
      if (mounted.current) setBusy("");
    }
  }
  function update(patch: Partial<Draft>, manual = false) {
    if (!latest.current) return;
    const value = editIncidentDraft(latest.current, patch, manual);
    latest.current = value;
    dirty.current = true;
    setDraft(value);
    queue.current = queue.current
      .catch(() => {})
      .then(() => store.setSetting(id ? "draft:" + id : "draft", value));
    void queue.current.catch(() => {
      if (mounted.current)
        setError(
          "Draft recovery could not be saved. Keep this screen open and retry.",
        );
    });
  }
  function back() {
    if (recordingRef.current || busy) {
      setError("Stop recording or cancel processing before leaving.");
      return;
    }
    const leave = () => {
      leaving.current = true;
      router.back();
    };
    if (dirty.current)
      Alert.alert(
        "Leave this draft?",
        "Completed media and text are kept on this phone. Reopen New report to continue.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Keep draft & leave", onPress: leave },
        ],
      );
    else leave();
  }
  const backRef = useRef(back);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const remove = navigation.addListener("beforeRemove", (e) => {
      if (leaving.current) return;
      if (dirty.current || recordingRef.current || busyRef.current) {
        e.preventDefault();
        backRef.current();
      }
    });
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      backRef.current();
      return true;
    });
    return () => {
      remove();
      handler.remove();
    };
  }, [navigation]);
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to reports"
          onPress={() => backRef.current()}
          style={{ padding: 12 }}
        >
          <Text style={styles.label}>Back</Text>
        </Pressable>
      ),
    });
  }, [navigation]);
  async function stop(runSpeech = true) {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    setBusy("Finalizing recording…");
    try {
      const audio = await recorder!.stop();
      update({ audio });
      await queue.current;
      setBusy("");
      if (runSpeech) await infer(audio);
      else
        setError(
          "Recording stopped when the app left the foreground. Completed audio is retained; tap Transcribe audio.",
        );
    } catch {
      setBusy("");
      setError(
        "Recording was interrupted and could not be recovered. Your photo and text are still available.",
      );
    }
  }
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    mounted.current = true;
    const operationState = operation.current;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (recordingRef.current) void stopRef.current(false);
        operationState.generation++;
        void speech.cancel();
        void extraction.cancel();
      }
    });
    return () => {
      mounted.current = false;
      sub.remove();
      operationState.generation++;
      void speech.cancel();
      void extraction.cancel();
      if (recordingRef.current) void recorder?.stop();
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSeconds(s);
      if (s >= 60) void stopRef.current();
      else if (!recorder?.isRecording()) void stopRef.current(false);
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);
  async function infer(audio: string) {
    const token = ++operation.current.generation;
    const original = latest.current?.note;
    setError("");
    setBusy("Transcribing on this phone · CPU");
    setProgress(0);
    try {
      const text = await speech.transcribe(audio, setProgress);
      if (
        token === operation.current.generation &&
        original === latest.current?.note
      ) {
        update({ note: text, transcription_source: "voice" });
        await collectSuggestions(text, token);
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Speech failed. Audio is retained for retry.",
        );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function collectSuggestions(text: string, token: number) {
    setBusy("Suggesting incident details on this phone · CPU");
    const suggestions = await extraction.extract(text);
    if (
      mounted.current &&
      token === operation.current.generation &&
      latest.current?.note === text
    )
      update(autoFillIncidentFields(latest.current, suggestions));
  }
  async function suggest() {
    const text = latest.current?.note;
    if (!text) return;
    const token = ++operation.current.generation;
    setError("");
    update({ extraction_review: undefined });
    try {
      await collectSuggestions(text, token);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Extraction failed. Your observation is retained.",
        );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function start() {
    setError("");
    if (!recorder) {
      setError(
        "WAV recording needs an Android native build. Typing and photo capture remain available.",
      );
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access is off",
          "Type your observation, or enable microphone access in Settings.",
          [
            { text: "Keep typing" },
            { text: "Settings", onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      await FS.makeDirectoryAsync(store.root + "audio/", {
        intermediates: true,
      });
      const audio = store.root + `audio/${randomUUID()}.wav`;
      await recorder.start(audio);
      recordingRef.current = true;
      setSeconds(0);
      setRecording(true);
    } catch {
      setError(
        "The microphone could not start. Close other recording apps or type your observation.",
      );
    }
  }
  async function photo(camera: boolean) {
    setError("");
    setBusy("Preparing photo…");
    try {
      if (camera) {
        const p = await Picker.requestCameraPermissionsAsync();
        if (!p.granted) {
          Alert.alert(
            "Camera access is off",
            "Choose a photo from the gallery or save a note instead.",
            [
              { text: "OK" },
              { text: "Settings", onPress: () => void Linking.openSettings() },
            ],
          );
          return;
        }
      }
      const result = camera
        ? await Picker.launchCameraAsync({ quality: 1, mediaTypes: ["images"] })
        : await Picker.launchImageLibraryAsync({
            quality: 1,
            mediaTypes: ["images"],
          });
      if (!result.canceled) update(await store.ownPhoto(result.assets[0].uri));
    } catch {
      setError(
        "Photo could not be prepared. Check available storage and try again.",
      );
    } finally {
      setBusy("");
    }
  }
  async function save() {
    if (!latest.current) return;
    setBusy("Saving locally…");
    setError("");
    try {
      await queue.current;
      const {
        audio,
        extraction_review: _review,
        extraction_auto: _auto,
        extraction_manual: _manual,
        ...report
      } = latest.current;
      await store.saveReport({
        ...report,
        location: report.location.trim(),
        updated_at: new Date().toISOString(),
      });
      if (audio)
        await FS.deleteAsync(audio, { idempotent: true }).catch(() => {});
      dirty.current = false;
      leaving.current = true;
      router.back();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save failed. Your draft is kept for retry.",
      );
    } finally {
      setBusy("");
    }
  }
  function discard() {
    Alert.alert(
      "Discard this draft?",
      "Unsaved text and completed audio will be removed.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await queue.current;
              await store.setSetting(id ? "draft:" + id : "draft", null);
              if (latest.current?.audio)
                await FS.deleteAsync(latest.current.audio, {
                  idempotent: true,
                });
              dirty.current = false;
              leaving.current = true;
              router.back();
            })().catch(() => setError("Could not discard. Retry."));
          },
        },
      ],
    );
  }
  function remove() {
    Alert.alert(
      "Delete report?",
      "Saved handover snapshots will remain. This source will show as unavailable.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await queue.current;
              await store.deleteReport(id!);
              await store.setSetting(id ? "draft:" + id : "draft", null);
              dirty.current = false;
              leaving.current = true;
              router.back();
            })().catch(() => setError("Delete failed. Retry."));
          },
        },
      ],
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>
          {id ? "Saved incident" : "New incident"}
        </Text>
        <Text style={styles.title}>
          {draft?.location || "What did you find?"}
        </Text>
        <Text style={styles.body}>
          Record the incident, observed hazards and requested resources. Saved
          on this phone.
        </Text>
        {recovered && (
          <Notice text="Recovered your completed draft. Review it before saving." />
        )}
        {error && <Notice text={error} error />}
        {!draft && !error && <Busy text="Opening draft…" />}
        {draft && (
          <>
            <View style={styles.card}>
              {draft.photo ? (
                <>
                  <Image
                    source={{ uri: draft.photo }}
                    accessibilityLabel="Report photo evidence"
                    resizeMode="contain"
                    style={{ height: 240, borderRadius: 12, width: "100%" }}
                  />
                  <Button
                    title="Remove photo"
                    secondary
                    disabled={!!busy || recording}
                    onPress={() =>
                      update({ photo: undefined, thumbnail: undefined })
                    }
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Photo evidence</Text>
                  <Text style={styles.body}>
                    One photo. Capture the detail, or choose from your gallery.
                  </Text>
                </>
              )}
              <View style={styles.row}>
                <Button
                  title={draft.photo ? "Retake" : "Camera"}
                  icon="camera-outline"
                  disabled={!!busy || recording}
                  onPress={() => void photo(true)}
                />
                <Button
                  title="Gallery"
                  secondary
                  icon="images-outline"
                  disabled={!!busy || recording}
                  onPress={() => void photo(false)}
                />
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Voice observation</Text>
              <Text style={styles.body}>
                Microphone audio stays local. Record up to 60 seconds, then
                transcribe and fill incident details automatically. Review the
                fields before saving. Prepare both models in Local AI first.
              </Text>
              <Text style={styles.body}>
                {speechLabel || "Selected local speech model"}. Change model and
                language in Local AI before recording.
              </Text>
              <Button
                title={
                  recording
                    ? `Stop recording · ${seconds}s / 60s`
                    : "Record observation"
                }
                icon={recording ? "stop" : "mic-outline"}
                danger={recording}
                disabled={!!busy}
                onPress={() => void (recording ? stop() : start())}
              />
              {draft.audio && !recording && (
                <Button
                  title="Transcribe audio / retry"
                  secondary
                  disabled={!!busy}
                  onPress={() => void infer(draft.audio!)}
                />
              )}
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Completed audio is removed after saving or discarding.
              </Text>
            </View>
            {busy && (
              <Busy
                text={
                  busy +
                  (busy.startsWith("Transcribing") ? ` · ${progress}%` : "")
                }
              />
            )}
            {busy.startsWith("Transcribing") && (
              <Button
                title="Cancel transcription"
                secondary
                onPress={() => {
                  operation.current.generation++;
                  setBusy("Cancelling transcription…");
                  void speech.cancel();
                }}
              />
            )}
            {busy.startsWith("Suggesting") && (
              <Button
                title="Cancel extraction"
                secondary
                onPress={() => {
                  operation.current.generation++;
                  setBusy("Cancelling extraction…");
                  void extraction.cancel();
                }}
              />
            )}
            <Field
              label="Barangay / location / landmark *"
              value={draft.location}
              disabled={!!busy || recording}
              onChange={(location) => update({ location })}
            />
            <View style={styles.card}>
              <Text style={styles.label}>GPS location (optional)</Text>
              <Text style={styles.body}>
                Tap below to allow a one-time location capture for this
                incident. Coordinates stay on this phone. GPS may need an
                outdoor view; no map or address lookup is required.
              </Text>
              <Button
                title={
                  draft.coordinates
                    ? "Refresh GPS location"
                    : "Capture GPS location"
                }
                secondary
                icon="location-outline"
                disabled={!!busy || recording}
                onPress={() => void captureLocation()}
              />
              {draft.coordinates && (
                <>
                  <Text selectable style={styles.body}>
                    {draft.coordinates.latitude.toFixed(6)},{" "}
                    {draft.coordinates.longitude.toFixed(6)} · Accuracy:{" "}
                    {draft.coordinates.accuracy === null
                      ? "unknown"
                      : `${Math.round(draft.coordinates.accuracy)} m`}
                    {"\n"}Captured{" "}
                    {new Date(draft.coordinates.captured_at).toLocaleString()}
                  </Text>
                  <Button
                    title="Remove GPS location"
                    secondary
                    disabled={!!busy || recording}
                    onPress={() => update({ coordinates: undefined })}
                  />
                </>
              )}
            </View>
            {recent.length > 0 && (
              <View style={styles.row}>
                {recent.map((location) => (
                  <Pressable
                    key={location}
                    accessibilityRole="button"
                    disabled={!!busy || recording}
                    onPress={() => update({ location })}
                    style={styles.chip}
                  >
                    <Text style={styles.label}>{location}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Field
              label="Original observation"
              multiline
              value={draft.note}
              disabled={!!busy || recording}
              onChange={(note) =>
                update({
                  note,
                  transcription_source:
                    draft.transcription_source === "typed"
                      ? "typed"
                      : "voice_edited",
                })
              }
            />
            <Field
              label="Reviewed incident description (optional)"
              multiline
              value={draft.issue}
              disabled={!!busy || recording}
              onChange={(issue) => update({ issue })}
            />
            <Button
              title="Fill incident details / retry"
              secondary
              disabled={!!busy || recording || !draft.note.trim()}
              onPress={() => void suggest()}
            />
            {error && <Notice text={error} error />}
            <Text style={styles.body}>
              Extraction fills the fields below on this phone. Check counts,
              negations and uncertainty before saving. Manual edits are kept.
            </Text>
            {draft.extraction_auto && (
              <Notice text="Incident details filled automatically. Review or edit the fields below before saving. Your manual entries are kept." />
            )}
            <Text style={styles.label}>Incident type</Text>
            <View style={styles.row}>
              {incidentTypes.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: (draft.incident_type || "Unspecified") === value,
                  }}
                  disabled={!!busy || recording}
                  onPress={() => update({ incident_type: value }, true)}
                  style={[
                    styles.chip,
                    (draft.incident_type || "Unspecified") === value &&
                      styles.chipActive,
                  ]}
                >
                  <Text style={styles.label}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Responder-assessed priority</Text>
            <Text style={styles.body}>
              Initially selected from your observation. Review and change based
              on your assessment. Unknown details can remain blank; the app does
              not assess structural safety.
            </Text>
            <View style={styles.row}>
              {priorities.map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: (draft.priority || "Unassessed") === value,
                  }}
                  disabled={!!busy || recording}
                  onPress={() => update({ priority: value }, true)}
                  style={[
                    styles.chip,
                    (draft.priority || "Unassessed") === value &&
                      styles.chipActive,
                  ]}
                >
                  <Text style={styles.label}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Field
              label="Affected people (confirmed count or description)"
              value={draft.affected_people || ""}
              disabled={!!busy || recording}
              onChange={(affected_people) => update({ affected_people }, true)}
            />
            <Field
              label="Observed hazards"
              multiline
              value={draft.hazards || ""}
              disabled={!!busy || recording}
              onChange={(hazards) => update({ hazards }, true)}
            />
            <Field
              label="Requested resources / needs"
              multiline
              value={draft.needs || ""}
              disabled={!!busy || recording}
              onChange={(needs) => update({ needs }, true)}
            />
            <Field
              label="Recorded follow-up (optional)"
              multiline
              value={draft.follow_up}
              disabled={!!busy || recording}
              onChange={(follow_up) => update({ follow_up })}
            />
            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
              {statuses.map((status) => (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected: draft.status === status }}
                  disabled={!!busy || recording}
                  onPress={() => update({ status })}
                  style={[
                    styles.chip,
                    draft.status === status && styles.chipActive,
                  ]}
                >
                  <Text style={styles.label}>{status}</Text>
                </Pressable>
              ))}
            </View>
            <Button
              title="Save on this phone"
              icon="checkmark"
              disabled={!!busy || recording}
              onPress={() => void save()}
            />
            <Button
              title="Discard unsaved changes"
              secondary
              disabled={!!busy || recording}
              onPress={discard}
            />
            {id && (
              <Button
                title="Delete report"
                danger
                disabled={!!busy || recording}
                onPress={remove}
              />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
