import React, { useCallback, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  Image,
  TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Report, statuses, Status, Draft } from "../domain";
import * as store from "../storage";
import { Button, Busy, Notice, styles, colors } from "../ui";
export default function History() {
  const [all, setAll] = useState<Report[]>([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<Status | "All">("All");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<Draft | null>(null);
  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([store.reports(), store.setting<Draft>("draft")])
      .then(([r, d]) => {
        if (active) {
          setAll(r);
          setDraft(d);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Reports could not be read. Retry to reopen local storage.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useFocusEffect(load);
  const data = all.filter(
    (r) =>
      (filter === "All" || r.status === filter) &&
      [
        r.location,
        r.note,
        r.issue,
        r.follow_up,
        r.incident_type || "",
        r.priority || "",
        r.affected_people || "",
        r.hazards || "",
        r.needs || "",
      ].some((t) => t.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <View style={styles.page}>
      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image
                source={require("../../assets/bantay-icon.png")}
                style={{ width: 52, height: 52, borderRadius: 10 }}
                accessibilityLabel="Bantay Field beacon logo"
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.ink, fontWeight: "800", fontSize: 23, letterSpacing: -0.6 }}
                >
                  Bantay Field
                </Text>
                <Text style={styles.eyebrow}>Ready beyond the signal</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>Offline field assistant</Text>
                <Text style={styles.title}>Incident reports</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Local AI setup"
                onPress={() => router.push("/setup")}
                style={{ padding: 14 }}
              >
                <Ionicons
                  name="hardware-chip-outline"
                  size={26}
                  color={colors.ink}
                />
              </Pressable>
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.ink, borderColor: colors.ink },
              ]}
            >
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                Your field notebook
              </Text>
              <Text style={{ fontSize: 23, fontWeight: "600", color: "white" }}>
                Keep the situation in sight.
              </Text>
              <Text style={{ color: colors.inverseMuted, lineHeight: 22 }}>
                Photos, incident details and resource requests stay on this
                phone.
              </Text>
              <Button
                title="New incident"
                icon="add"
                onPress={() => router.push("/capture")}
              />
            </View>
            {draft && (
              <Notice text="You have an unfinished report. New incident will reopen your saved draft." />
            )}
            <Button
              title={`Create handover · ${all.length} reports`}
              secondary
              icon="documents-outline"
              onPress={() => router.push("/handover")}
            />
            <TextInput
              accessibilityLabel="Search reports"
              placeholder="Search incidents, location or needs"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />
            <View style={styles.row}>
              {(["All", ...statuses] as const).map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === s }}
                  onPress={() => setFilter(s)}
                  style={[styles.chip, filter === s && styles.chipActive]}
                >
                  <Text style={styles.label}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.eyebrow}>
              {data.length} {data.length === 1 ? "report" : "reports"} · newest
              first
            </Text>
            {error && (
              <>
                <Notice text={error} error />
                <Button title="Retry" onPress={load} />
              </>
            )}
            {loading && <Busy text="Opening local reports…" />}
          </View>
        }
        renderItem={({ item: r }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${r.location}, ${r.status}`}
            onPress={() =>
              router.push({ pathname: "/capture", params: { id: r.id } })
            }
            style={[styles.card, { marginTop: 12 }]}
          >
            <View style={{ flexDirection: "row", gap: 14 }}>
              {r.thumbnail ? (
                <Image
                  source={{ uri: r.thumbnail }}
                  style={{ width: 68, height: 76, borderRadius: 10 }}
                  accessibilityLabel="Incident evidence thumbnail"
                />
              ) : (
                <View style={{ width: 55, justifyContent: "center" }}>
                  <Ionicons
                    name="document-text-outline"
                    size={28}
                    color={colors.muted}
                  />
                </View>
              )}
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "600", color: colors.ink }}
                >
                  {r.location}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {r.issue || r.note || "Photo evidence"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {r.priority ? `${r.priority} · ` : ""}
                  {new Date(r.created_at).toLocaleDateString()} · {r.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={[styles.card, { marginTop: 15, paddingVertical: 30 }]}>
              <Ionicons name="layers-outline" size={32} color={colors.ink} />
              <Text
                style={{ fontSize: 20, fontWeight: "600", color: colors.ink }}
              >
                {all.length
                  ? "No matching reports"
                  : "Your first incident starts here"}
              </Text>
              <Text style={styles.body}>
                {all.length
                  ? "Try another search or status."
                  : "Capture a photo, record a note, or just type. No connection needed."}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
