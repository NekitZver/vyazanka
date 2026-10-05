import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { hatPattern } from "./src/hat";

const FIELDS = [
  { key: "head", label: "Head circumference, cm", initial: "56" },
  { key: "height", label: "Hat height, cm", initial: "22" },
  { key: "st", label: "Gauge: stitches per 10 cm", initial: "20" },
  { key: "rows", label: "Gauge: rows per 10 cm", initial: "28" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

export default function App() {
  const [values, setValues] = useState<Record<Key, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, f.initial])) as Record<Key, string>,
  );

  const n = (k: Key) => Number(values[k].replace(",", "."));
  let steps: string[] = [];
  let error = "";
  try {
    steps = hatPattern({
      headCircumferenceCm: n("head"),
      heightCm: n("height"),
      gauge: { stitchesPer10cm: n("st"), rowsPer10cm: n("rows") },
    }).steps;
  } catch {
    error = "Enter positive numbers in every field.";
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hat pattern</Text>
        {FIELDS.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={values[f.key]}
              onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
            />
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {steps.map((s, i) => (
          <Text key={i} style={styles.step}>
            {i + 1}. {s}
          </Text>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  field: { gap: 4 },
  label: { fontSize: 14, color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: "#b00020" },
  step: { fontSize: 16, lineHeight: 22 },
});
