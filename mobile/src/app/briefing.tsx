import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Share } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Report, Summary, summaryText } from "../domain";
import * as store from "../storage";
import { Button, Busy, Notice, styles, colors } from "../ui";
export default function Briefing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [summary, setSummary] = useState<Summary | null>(null),
    [all, setAll] = useState<Report[]>([]),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    Promise.all([store.summaries(), store.reports()])
      .then(([s, r]) => {
        const found = s.find((s) => s.id === id);
        if (!found) throw new Error("Snapshot unavailable.");
        setSummary(found);
        setAll(r);
      })
      .catch(() =>
        setError(
          "This handover could not be opened. Return to Handover and retry.",
        ),
      );
  }, [id]);
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Immutable snapshot · Compiled</Text>
      <Text style={styles.title}>Site handover</Text>
      {error && <Notice text={error} error />}
      {!summary && !error && <Busy text="Opening local snapshot…" />}
      {summary && (
        <>
          <Text style={styles.body}>
            {new Date(summary.created_at).toLocaleString()} ·{" "}
            {summary.source_report_ids.length} source reports
          </Text>
          <Notice text="Exact saved text at the time of compilation. Later report edits do not change this snapshot." />
          {(["issues_by_location", "work_list"] as const).map((section) => (
            <View key={section} style={{ gap: 12 }}>
              <Text style={styles.eyebrow}>
                {section === "work_list"
                  ? "Recorded follow-ups"
                  : "Observations by location"}
              </Text>
              {summary.items
                .filter((i) => i.section === section)
                .map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "600",
                        color: colors.ink,
                      }}
                    >
                      {item.location}
                    </Text>
                    <Text
                      selectable
                      style={[styles.body, { color: colors.ink }]}
                    >
                      {item.text}
                    </Text>
                    {item.source_report_ids.map((source) =>
                      all.some((r) => r.id === source) ? (
                        <Button
                          key={source}
                          title="Open source report"
                          secondary
                          icon="arrow-forward"
                          onPress={() =>
                            router.push({
                              pathname: "/capture",
                              params: { id: source },
                            })
                          }
                        />
                      ) : (
                        <Text key={source} style={styles.body}>
                          Source unavailable · Report deleted
                        </Text>
                      ),
                    )}
                  </View>
                ))}
              {!summary.items.some((i) => i.section === section) && (
                <Text style={styles.body}>
                  No follow-up recorded in these reports.
                </Text>
              )}
            </View>
          ))}
          <Button
            title={copied ? "Copied" : "Copy handover"}
            icon="copy-outline"
            onPress={() => {
              void Clipboard.setStringAsync(summaryText(summary))
                .then(() => setCopied(true))
                .catch(() => setError("Copy failed. Retry."));
            }}
          />
          <Button
            title="Share text"
            secondary
            icon="share-outline"
            onPress={() => {
              void Share.share({ message: summaryText(summary) }).catch(() =>
                setError("Sharing failed. Retry."),
              );
            }}
          />
        </>
      )}
    </ScrollView>
  );
}
