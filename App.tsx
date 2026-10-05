import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { TEMPLATES } from "./src/templates";

export default function App() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const template = TEMPLATES.find((t) => t.id === templateId)!;

  // typed values override defaults; defaults are per template so switching keeps what was typed
  const raw = (key: string, initial: string) => values[`${templateId}.${key}`] ?? initial;

  let steps: string[] = [];
  let error = "";
  try {
    steps = template.build(
      Object.fromEntries(template.fields.map((f) => [f.key, Number(raw(f.key, f.initial).replace(",", "."))])),
    );
  } catch {
    error = "Enter positive numbers in every field (for a dog sweater the chest must be larger than the neck).";
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.tabs}>
          {TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTemplateId(t.id)}
              style={[styles.tab, t.id === templateId && styles.tabActive]}
            >
              <Text style={t.id === templateId ? styles.tabTextActive : undefined}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
        {template.fields.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={raw(f.key, f.initial)}
              onChangeText={(t) => setValues((v) => ({ ...v, [`${templateId}.${f.key}`]: t }))}
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
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  tabActive: { backgroundColor: "#222", borderColor: "#222" },
  tabTextActive: { color: "#fff" },
  field: { gap: 4 },
  label: { fontSize: 14, color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: "#b00020" },
  step: { fontSize: 16, lineHeight: 22 },
});
