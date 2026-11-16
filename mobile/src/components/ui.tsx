import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

// Matches the web app: navy navigation, blue primary actions, 15–16px text, large touch targets.
export const colors = {
  navy: "#14213d",
  blue: "#1d4ed8",
  text: "#111827",
  muted: "#4b5563",
  border: "#cbd5e1",
  bg: "#f1f5f9",
  card: "#ffffff",
  red: "#b91c1c",
  amber: "#b45309",
  green: "#15803d",
};

export function Button({ title, onPress, kind = "primary", disabled }: { title: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        kind === "primary" && { backgroundColor: colors.blue },
        kind === "secondary" && { backgroundColor: colors.card, borderColor: colors.blue, borderWidth: 2 },
        kind === "danger" && { backgroundColor: colors.red },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonText, kind === "secondary" && { color: colors.blue }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: "top" }]} {...props} />
    </View>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}
            >
              <Text style={[styles.chipText, on && { color: "#fff" }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  section: { fontSize: 17, fontWeight: "700", color: colors.navy, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.text },
  button: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginBottom: 10 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff" },
  chipText: { fontSize: 15, color: colors.text },
  note: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6 },
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function severityColor(s: number): string {
  return s >= 4 ? colors.red : s === 3 ? colors.amber : colors.green;
}
