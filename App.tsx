import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Chart } from "./src/chart";
import { TEMPLATES, type Result } from "./src/templates";

export default function App() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const template = TEMPLATES.find((t) => t.id === templateId)!;

  // typed values override defaults; defaults are per template so switching keeps what was typed
  const raw = (key: string, initial: string) => values[`${templateId}.${key}`] ?? initial;

  let result: Result | null = null;
  let error = "";
  try {
    result = template.build(
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
        {result ? (
          <>
            <Section title="Finished size" lines={result.finished} />
            {result.table ? <SizeTable rows={result.table} /> : null}
            <Section title="Materials" lines={result.materials} />
            {result.chart ? <ChartView chart={result.chart} /> : null}
            <Section title="Instructions" lines={result.steps.map((s, i) => `${i + 1}. ${s}`)} />
            <Section title="Notes" lines={result.notes} />
          </>
        ) : null}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function Section({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={styles.step}>
          {l}
        </Text>
      ))}
    </View>
  );
}

function SizeTable({ rows }: { rows: string[][] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sizes</Text>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          {r.map((c, j) => (
            <Text key={j} style={[styles.cell, i === 0 && styles.bold]}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const SYMBOL = { k: "", p: "•", x: "✕" } as const;

// Chart rows are numbered from the bottom, so draw the last row first.
function ChartView({ chart }: { chart: Chart }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Chart (8-row repeat, read right to left)</Text>
      <ScrollView horizontal>
        <View>
          {chart.rows
            .map((row, i) => (
              <View key={i} style={styles.chartRow}>
                <Text style={styles.rowNo}>{i + 1}</Text>
                {[...row].reverse().map((s, j) => (
                  <View key={j} style={[styles.chartCell, s !== "p" && styles.chartKnit]}>
                    <Text style={styles.chartSymbol}>{SYMBOL[s]}</Text>
                  </View>
                ))}
              </View>
            ))
            .reverse()}
        </View>
      </ScrollView>
      {Object.entries(chart.legend).map(([k, v]) => (
        <Text key={k} style={styles.step}>
          {SYMBOL[k as keyof typeof SYMBOL] || "▢"} {v}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tableRow: { flexDirection: "row" },
  cell: { flex: 1, fontSize: 15, paddingVertical: 2 },
  bold: { fontWeight: "600" },
  chartRow: { flexDirection: "row", alignItems: "center" },
  rowNo: { width: 22, fontSize: 11, color: "#888" },
  chartCell: { width: 20, height: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  chartKnit: { backgroundColor: "#e8dcf8" },
  chartSymbol: { fontSize: 12, color: "#6a4cb0" },
  section: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 8 },
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
