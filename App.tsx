import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Chart, Stitch } from "./src/chart";
import { parsePrompt } from "./src/prompt";
import { castOnOf, metersOf, TEMPLATES, type Result, type Size } from "./src/templates";
import { gaugeOf, nearestYarn, YARN_WEIGHTS } from "./src/yarn";

const EXAMPLES = ["Chunky ribbed beanie, 56 cm", "Cable sweater, 96 cm", "Тонкий снуд 60 см", "Dog sweater, worsted"];
const GROUPS: { id: Size["group"]; label: string }[] = [
  { id: "adults", label: "Adults" },
  { id: "kids", label: "Kids · 2–12 y" },
  { id: "babies", label: "Babies · 0–24 mo" },
];
const STEP_MS = 450;
const STEPS = 6;

type Values = Record<string, number>;

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [group, setGroup] = useState<Size["group"]>("adults");
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [tick, setTick] = useState(0);
  const [notice, setNotice] = useState("");
  const [showFields, setShowFields] = useState(false);

  const template = TEMPLATES.find((t) => t.id === templateId)!;
  // typed values override defaults; defaults are per template so switching keeps what was typed
  const raw = (key: string, initial: string) => values[`${templateId}.${key}`] ?? initial;
  const nums: Values = Object.fromEntries(
    template.fields.map((f) => [f.key, Number(raw(f.key, f.initial).replace(",", "."))]),
  );
  const setNums = (id: string, v: Values) =>
    setValues((old) => ({ ...old, ...Object.fromEntries(Object.entries(v).map(([k, n]) => [`${id}.${k}`, String(n)])) }));

  let result: Result | null = null;
  try {
    result = template.build(nums);
  } catch {
    result = null;
  }
  const yarn = nearestYarn(nums.st);
  const groups = GROUPS.filter((g) => template.sizes.some((s) => s.group === g.id));
  const sizeRows = template.sizes.filter((s) => s.group === group || groups.length === 0);

  // the pattern is calculated instantly; the animation knits the real chart up row by row while showing real numbers
  useEffect(() => {
    if (phase !== "generating") return;
    if (tick >= STEPS * STEP_MS) return setPhase("done");
    const id = setTimeout(() => setTick((t) => t + 50), 50);
    return () => clearTimeout(id);
  }, [phase, tick]);

  function generate(text = prompt) {
    setPrompt(text);
    const parsed = parsePrompt(text);
    if (!parsed) {
      setNotice("I can knit hats, snoods, scarves, sweaters and dog sweaters for now. Try one of the examples.");
      return;
    }
    setNotice("");
    const t = TEMPLATES.find((x) => x.id === parsed.templateId)!;
    const update: Values = {};
    const w = YARN_WEIGHTS.find((y) => y.name === parsed.yarn);
    if (w) Object.assign(update, { st: w.stitchesPer10cm, rows: gaugeOf(w).rowsPer10cm });
    // centimeters go into the measurement fields in the order they were written
    parsed.numbers.forEach((n, i) => {
      const f = t.fields[i];
      if (f && f.key !== "st" && f.key !== "rows") update[f.key] = n;
    });
    if (/baby|newborn|малыш|младен/i.test(text)) setGroup("babies");
    else if (/kid|child|детск|ребён|ребен/i.test(text)) setGroup("kids");
    else setGroup("adults");
    setTemplateId(t.id);
    setNums(t.id, update);
    setTick(0);
    setPhase("generating");
  }

  const step = Math.min(STEPS - 1, Math.floor(tick / STEP_MS));
  const stepText = [
    `Reading your description: ${template.name} · ${yarn.name}`,
    `Picking gauge: ${nums.st} sts × ${nums.rows} rows = 10 cm`,
    `Grading ${template.sizes.length} sizes`,
    `Counting stitches: cast on ${result ? castOnOf(result) : "…"}`,
    "Writing row-by-row instructions",
    "Drawing the stitch chart",
  ][step];
  const progress = tick / (STEPS * STEP_MS);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>What do you want to knit?</Text>
        <View style={styles.promptBar}>
          <TextInput
            style={styles.promptInput}
            placeholder="Describe it: a chunky ribbed beanie, 56 cm…"
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={() => generate()}
          />
          <Pressable
            style={[styles.generate, phase === "generating" && styles.generateBusy]}
            disabled={phase === "generating"}
            onPress={() => generate()}
          >
            <Text style={styles.generateText}>{phase === "generating" ? "Generating…" : "Generate"}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Every number is calculated, not guessed: stitch counts always add up.</Text>
        {notice ? <Text style={styles.error}>{notice}</Text> : null}

        <View style={styles.row}>
          {EXAMPLES.map((e) => (
            <Pressable key={e} style={styles.chip} onPress={() => generate(e)}>
              <Text style={styles.chipText}>{e}</Text>
            </Pressable>
          ))}
        </View>
        {phase !== "idle" && groups.length > 1 && (
          <View style={styles.row}>
            <Text style={styles.label}>Sizes:</Text>
            {groups.map((g) => (
              <Pressable key={g.id} style={[styles.pill, g.id === group && styles.pillActive]} onPress={() => setGroup(g.id)}>
                <Text style={g.id === group ? styles.pillTextActive : styles.pillText}>{g.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {phase === "generating" && (
          <View style={styles.card}>
            {result?.chart ? <ChartView chart={result.chart} revealed={progress} /> : null}
            <Text style={styles.stepText}>{stepText}…</Text>
            <Text style={styles.stepCount}>
              STEP {step + 1} OF {STEPS}
            </Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        )}

        {phase === "done" && (
          <View style={styles.card}>
            <Text style={styles.h2}>
              {template.name} · {yarn.name}
            </Text>
            {!result ? (
              <Text style={styles.error}>
                Enter positive numbers in every field (for a dog sweater the chest must be larger than the neck).
              </Text>
            ) : (
              <>
                {result.chart ? <ChartView chart={result.chart} revealed={1} /> : null}

                <Text style={styles.h3}>Sizes</Text>
                <View style={styles.table}>
                  <View style={[styles.tr, styles.th]}>
                    <Text style={styles.tdSize}>Size</Text>
                    <Text style={styles.td}>Measurements</Text>
                    <Text style={styles.tdNum}>Cast on</Text>
                    <Text style={styles.tdNum}>Yarn</Text>
                  </View>
                  {sizeRows.map((s) => {
                    const r = template.build({ ...nums, ...s.values });
                    const active = Object.entries(s.values).every(([k, n]) => nums[k] === n);
                    return (
                      <Pressable key={s.label} style={[styles.tr, active && styles.trActive]} onPress={() => setNums(template.id, s.values)}>
                        <Text style={styles.tdSize}>{s.label}</Text>
                        <Text style={styles.td}>{Object.values(s.values).join(" × ")} cm</Text>
                        <Text style={styles.tdNum}>{castOnOf(r)}</Text>
                        <Text style={styles.tdNum}>{metersOf(r)} m</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.hint}>Tap a size to rewrite the pattern for it.</Text>

                <Section title="Finished size" lines={result.finished} />
                <Section title="Materials" lines={[...result.materials, `Gauge: ${nums.st} sts × ${nums.rows} rows = 10 cm`]} />
                <Section title="Instructions" lines={result.steps.map((s, i) => `${i + 1}. ${s}`)} />
                <Section title="Notes" lines={result.notes} muted />
              </>
            )}

            <Pressable onPress={() => setShowFields((x) => !x)}>
              <Text style={styles.link}>{showFields ? "Hide measurements" : "Adjust measurements and gauge"}</Text>
            </Pressable>
            {showFields && (
              <>
                {template.presets.map((presets, i) => (
                  <View key={i} style={styles.row}>
                    {presets.map((p) => {
                      const active = Object.entries(p.values).every(([k, n]) => nums[k] === n);
                      return (
                        <Pressable key={p.label} style={[styles.pill, active && styles.pillActive]} onPress={() => setNums(template.id, p.values)}>
                          <Text style={active ? styles.pillTextActive : styles.pillText}>{p.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
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
              </>
            )}
          </View>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function Section({ title, lines, muted }: { title: string; lines: string[]; muted?: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h3}>{title}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={muted ? styles.note : styles.step}>
          {l}
        </Text>
      ))}
    </View>
  );
}

const SYMBOL: Record<Stitch, string> = { k: "", p: "•", x: "✕", dec: "⟋", inc: "+", none: "" };

// Rows are numbered from the bottom and read right to left, so draw the last row first and each row reversed.
// While generating, rows appear bottom-up as `revealed` goes from 0 to 1.
function ChartView({ chart, revealed }: { chart: Chart; revealed: number }) {
  const shown = Math.floor(revealed * chart.rows.length);
  return (
    <View style={styles.section}>
      <ScrollView horizontal contentContainerStyle={styles.chartScroll}>
        <View style={styles.chart}>
          {chart.rows
            .map((row, i) => (
              <View key={i} style={[styles.chartRow, { opacity: i < shown ? 1 : 0.12 }]}>
                {[...row].reverse().map((s, j) => (
                  <View key={j} style={[styles.cell, styles[s]]}>
                    <Text style={styles.cellText}>{SYMBOL[s]}</Text>
                  </View>
                ))}
                <Text style={styles.rowNum}>{(i + 1) % 4 === 0 ? i + 1 : ""}</Text>
              </View>
            ))
            .reverse()}
        </View>
      </ScrollView>
      {revealed >= 1 &&
        Object.entries(chart.legend).map(([k, v]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.cell, styles[k as Stitch]]}>
              <Text style={styles.cellText}>{SYMBOL[k as Stitch]}</Text>
            </View>
            <Text style={styles.legendText}>{v}</Text>
          </View>
        ))}
    </View>
  );
}

const LILAC = "#9b7be0";
const LILAC_LIGHT = "#eee6fb";
const INK = "#2a2340";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f7fb" },
  content: { padding: 16, gap: 12, maxWidth: 720, width: "100%", alignSelf: "center" },
  h1: { fontSize: 28, fontWeight: "600", color: INK, marginTop: 8 },
  h2: { fontSize: 20, fontWeight: "600", color: INK },
  h3: { fontSize: 16, fontWeight: "600", color: INK, marginTop: 8 },
  promptBar: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 28, padding: 6,
    paddingLeft: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 2,
  },
  promptInput: { flex: 1, fontSize: 16, paddingVertical: 10, color: INK },
  generate: { backgroundColor: LILAC, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12 },
  generateBusy: { opacity: 0.6 },
  generateText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 12, color: "#888" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: { backgroundColor: LILAC_LIGHT, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { color: "#5b4a86" },
  pill: { borderWidth: 1, borderColor: "#ddd", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fff" },
  pillActive: { backgroundColor: LILAC_LIGHT, borderColor: LILAC },
  pillText: { color: "#555" },
  pillTextActive: { color: "#5b3fb0", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: "#e6def7" },
  section: { gap: 4 },
  chartScroll: { flexGrow: 1, justifyContent: "center" },
  chart: { gap: 1 },
  chartRow: { flexDirection: "row", gap: 1, alignItems: "center" },
  cell: { width: 16, height: 14, alignItems: "center", justifyContent: "center", borderRadius: 2 },
  k: { backgroundColor: LILAC_LIGHT },
  p: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  x: { backgroundColor: "#d9c9f5" },
  dec: { backgroundColor: "#fbf0c9" },
  inc: { backgroundColor: "#d9f2e3" },
  none: { backgroundColor: "transparent" },
  cellText: { fontSize: 10, color: "#6b55a8", lineHeight: 12 },
  rowNum: { width: 18, fontSize: 9, color: "#aaa", marginLeft: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 12, color: "#555", flexShrink: 1 },
  stepText: { textAlign: "center", color: "#555", marginTop: 8 },
  stepCount: { textAlign: "center", fontSize: 11, letterSpacing: 1, color: "#999" },
  progress: { height: 6, backgroundColor: LILAC_LIGHT, borderRadius: 3, overflow: "hidden", width: 220, alignSelf: "center" },
  progressFill: { height: 6, backgroundColor: LILAC },
  table: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, overflow: "hidden" },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  th: { backgroundColor: "#f6f4fb", borderTopWidth: 0 },
  trActive: { backgroundColor: LILAC_LIGHT },
  tdSize: { width: 70, fontWeight: "600", color: INK },
  td: { flex: 1, color: "#444" },
  tdNum: { width: 70, textAlign: "right", color: "#444" },
  step: { fontSize: 15, lineHeight: 22, color: INK },
  note: { fontSize: 13, lineHeight: 19, color: "#777" },
  link: { color: LILAC, fontWeight: "600", marginTop: 8 },
  field: { gap: 4 },
  label: { fontSize: 14, color: "#555" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: "#fff" },
  error: { color: "#b00020" },
});
