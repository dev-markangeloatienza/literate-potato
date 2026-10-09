import React from "react";
import {
  Pressable,
  Text,
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
export const colors = {
  bg: "#F4F3EE",
  ink: "#173C35",
  muted: "#566B64",
  line: "#D9DED5",
  accent: "#DCEEA4",
  white: "#FFFFFF",
  danger: "#A33131",
};
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: colors.danger },
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={secondary ? colors.ink : colors.white}
        />
      )}
      <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, error && { backgroundColor: "#FBE8E3" }]}
    >
      <Text
        style={{ color: error ? colors.danger : colors.ink, lineHeight: 21 }}
      >
        {text}
      </Text>
    </View>
  );
}
export function Busy({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 16,
        alignItems: "center",
      }}
    >
      <ActivityIndicator color={colors.ink} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 22,
    gap: 20,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -1,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  button: {
    minHeight: 50,
    backgroundColor: colors.ink,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: "#E9EDE5" },
  buttonText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    minHeight: 50,
  },
  notice: { backgroundColor: "#E9EFD9", padding: 15, borderRadius: 12 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#E8EDE4",
    minHeight: 44,
  },
  chipActive: { backgroundColor: colors.accent },
  divider: { height: 1, backgroundColor: colors.line },
});
