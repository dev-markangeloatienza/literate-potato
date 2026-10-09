import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collectOrphans } from "../storage";
import { Button, Busy, Notice, colors } from "../ui";
export const unstable_settings = { initialRouteName: "index" };
export default function Layout() {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  function open() {
    setError("");
    collectOrphans()
      .then(() => setReady(true))
      .catch(() =>
        setError(
          "Local storage could not open. Free some space if needed, then retry.",
        ),
      );
  }
  useEffect(() => {
    collectOrphans()
      .then(() => setReady(true))
      .catch(() =>
        setError(
          "Local storage could not open. Free some space if needed, then retry.",
        ),
      );
  }, []);
  if (!ready)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 24, gap: 16 }}>
          {error ? (
            <>
              <Notice text={error} error />
              <Button title="Retry local storage" onPress={open} />
            </>
          ) : (
            <Busy text="Opening your field notebook…" />
          )}
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "FieldBrief" }} />
        <Stack.Screen
          name="capture"
          options={{ title: "Site report", gestureEnabled: false }}
        />
        <Stack.Screen name="setup" options={{ title: "Local AI" }} />
        <Stack.Screen name="handover" options={{ title: "Handover" }} />
        <Stack.Screen name="briefing" options={{ title: "Saved briefing" }} />
      </Stack>
    </SafeAreaView>
  );
}
