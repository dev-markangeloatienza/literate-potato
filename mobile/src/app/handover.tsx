import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import { Report, Summary, compile } from "../domain";
import * as store from "../storage";
import { Button, Busy, Notice, styles, colors } from "../ui";
export default function Handover() {
  const [all, setAll] = useState<Report[]>([]),
    [saved, setSaved] = useState<Summary[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(() => {
    let active = true;
    setBusy(true);
    Promise.all([store.reports(), store.summaries()])
      .then(([r, s]) => {
        if (active) {
          setAll(r);
          setSaved(s);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Local handovers could not be opened. Retry.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useFocusEffect(load);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const summary = compile(
        all.filter((r) => selected.includes(r.id)),
        randomUUID(),
        new Date().toISOString(),
      );
      await store.saveSummary(summary);
      router.push({ pathname: "/briefing", params: { id: summary.id } });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Handover could not be saved. Retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>From observation to handover</Text>
      <Text style={styles.title}>Bring the site together.</Text>
      <Text style={styles.body}>
        Select reports to compile exact saved observations, statuses and
        recorded follow-ups. Every item links back to its source.
      </Text>
      <Notice text="Compiled handover · No AI rewriting · No model or connection required" />
      {error && (
        <>
          <Notice text={error} error />
          <Button title="Retry" onPress={load} />
        </>
      )}
      {busy && <Busy text="Opening / saving local handover…" />}
      <View style={styles.row}>
        <Text style={[styles.label, { flex: 1 }]}>
          {selected.length} selected
        </Text>
        <Button
          title={selected.length === all.length ? "Clear" : "Select all"}
          secondary
          disabled={busy}
          onPress={() =>
            setSelected(
              selected.length === all.length ? [] : all.map((r) => r.id),
            )
          }
        />
      </View>
      {all.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected.includes(r.id) }}
          accessibilityLabel={`Select ${r.location}`}
          disabled={busy}
          onPress={() =>
            setSelected((s) =>
              s.includes(r.id) ? s.filter((id) => id !== r.id) : [...s, r.id],
            )
          }
          style={styles.card}
        >
          <View style={styles.row}>
            <Ionicons
              name={selected.includes(r.id) ? "checkbox" : "square-outline"}
              size={25}
              color={colors.ink}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: colors.ink }}
              >
                {r.location}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {r.issue || r.note || "Photo evidence"}
              </Text>
              <Text style={styles.eyebrow}>{r.status}</Text>
            </View>
          </View>
        </Pressable>
      ))}
      {!all.length && !busy && (
        <Notice text="Save a report first, then return here to make your handover." />
      )}
      <Button
        title={`Save compiled handover · ${selected.length}`}
        disabled={busy || !selected.length}
        icon="documents-outline"
        onPress={() => void create()}
      />
      <View style={styles.divider} />
      <Text style={styles.eyebrow}>Saved snapshots</Text>
      {saved.map((s) => (
        <Button
          key={s.id}
          secondary
          title={`${new Date(s.created_at).toLocaleString()} · ${s.source_report_ids.length} reports`}
          onPress={() =>
            router.push({ pathname: "/briefing", params: { id: s.id } })
          }
        />
      ))}
      {!saved.length && (
        <Text style={styles.body}>Your saved handovers will appear here.</Text>
      )}
    </ScrollView>
  );
}
