import { hatPattern, type Gauge } from "./hat.ts";
import { sweaterPattern, SIZES } from "./sweater.ts";
import { gaugeOf, nearestYarn, YARN_WEIGHTS } from "./yarn.ts";
import { shapeChart, type Chart } from "./chart.ts";
import { dogSweaterPattern, scarfPattern, snoodPattern } from "./patterns.ts";

export interface Field {
  key: string;
  label: string;
  initial: string;
}

export interface Result {
  finished: string[]; // finished measurements
  materials: string[];
  steps: string[];
  notes: string[];
  table?: string[][]; // size table, first row is the header
  chart?: Chart;
}

// Rough yarn estimate: about 4 stitch widths of yarn per stitch in stockinette, plus 10%. Real use varies by about 25%.
// ponytail: replace with a measured value once the user can weigh a swatch
const yarnMeters = (stitchTotal: number, g: Gauge) => Math.round((stitchTotal * 4 * (10 / g.stitchesPer10cm) * 1.1) / 100 / 10) * 10;

const NOTES = [
  "Knit a swatch first and measure it: the numbers above are only as accurate as your gauge.",
  "Gauge you enter is used as given, nothing is verified for you.",
];

function materials(stitchTotal: number, g: Gauge): string[] {
  const m = yarnMeters(stitchTotal, g);
  const y = nearestYarn(g.stitchesPer10cm);
  const skeins = Math.ceil(m / y.metersPer100g);
  return [
    `Yarn: about ${m} m, roughly ${skeins} x 100 g of ${y.name} weight (estimate, buy one spare)`,
    `Needles: about ${y.needleMm} mm for ${y.name}, but use the size that gives ${g.stitchesPer10cm} stitches per 10 cm`,
  ];
}

function result(p: { stitchTotal: number; finished: string[]; steps: string[]; table?: string[][]; chart?: Chart }, g: Gauge): Result {
  return {
    table: p.table,
    chart: p.chart,
    finished: p.finished,
    materials: materials(p.stitchTotal, g),
    steps: p.steps,
    notes: NOTES,
  };
}

export interface Preset {
  label: string;
  values: Record<string, number>;
}

// Yarn weight buttons fill in the gauge for that weight.
const yarnPresets: Preset[] = YARN_WEIGHTS.map((y) => ({ label: y.name, values: { st: y.stitchesPer10cm, rows: gaugeOf(y).rowsPer10cm } }));

export interface Size {
  group: "adults" | "kids" | "babies" | "dogs";
  label: string;
  values: Record<string, number>; // measurement fields only, the gauge stays as the user set it
}

export interface Template {
  id: string;
  name: string;
  fields: Field[];
  build: (v: Record<string, number>) => Result;
  presets: Preset[][]; // groups of buttons that fill in fields
  sizes: Size[]; // graded sizes for the size table
}

// ponytail: sizes from common knitting size charts, not measured by us; adjust with real fittings
const sizes = (group: Size["group"], keys: string[], rows: [string, ...number[]][]): Size[] =>
  rows.map(([label, ...nums]) => ({ group, label, values: Object.fromEntries(keys.map((k, i) => [k, nums[i]])) }));

/** Numbers the size table needs, read from a built result. */
export const castOnOf = (r: Result) => Number(r.steps.join(" ").match(/cast on (\d+)/i)?.[1] ?? 0);
export const metersOf = (r: Result) => Number(r.materials[0].match(/about (\d+) m/)?.[1] ?? 0);

const gaugeFields: Field[] = [
  { key: "st", label: "Gauge: stitches per 10 cm", initial: "20" },
  { key: "rows", label: "Gauge: rows per 10 cm", initial: "28" },
];
const gauge = (v: Record<string, number>) => ({ stitchesPer10cm: v.st, rowsPer10cm: v.rows });
const rowsOf = (cm: number, v: Record<string, number>) => Math.round((cm / 10) * v.rows);

export const TEMPLATES: Template[] = [
  {
    id: "hat",
    name: "Hat",
    fields: [
      { key: "head", label: "Head circumference, cm", initial: "56" },
      { key: "height", label: "Hat height, cm", initial: "22" },
      ...gaugeFields,
    ],
    presets: [yarnPresets],
    build: (v) => {
      const p = hatPattern({ headCircumferenceCm: v.head, heightCm: v.height, gauge: gauge(v) });
      const chart = shapeChart([
        { kind: "rib", rows: 8 },
        { kind: "knit", rows: p.bodyRounds - 8 },
        { kind: "decrease", rows: p.crownDecreaseRounds * 2 },
      ]);
      return result({ ...p, chart }, gauge(v));
    },
    sizes: [
      ...sizes("babies", ["head", "height"], [["0-6 mo", 38, 14], ["6-12 mo", 43, 16], ["12-24 mo", 47, 18]]),
      ...sizes("kids", ["head", "height"], [["2-4 y", 49, 19], ["4-8 y", 51, 20], ["8-12 y", 53, 21]]),
      ...sizes("adults", ["head", "height"], [
        ["XS", 52, 20], ["S", 54, 21], ["M", 56, 22], ["L", 58, 23], ["XL", 60, 23], ["2XL", 62, 24], ["3XL", 64, 24],
      ]),
    ],
  },
  {
    id: "snood",
    name: "Snood",
    fields: [
      { key: "circ", label: "Circumference, cm", initial: "60" },
      { key: "height", label: "Height, cm", initial: "25" },
      ...gaugeFields,
    ],
    presets: [yarnPresets],
    build: (v) => result({ ...snoodPattern(v.circ, v.height, gauge(v)), chart: shapeChart([{ kind: "rib", rows: rowsOf(v.height, v) }]) }, gauge(v)),
    sizes: [
      ...sizes("babies", ["circ", "height"], [["0-12 mo", 40, 12], ["12-24 mo", 44, 14]]),
      ...sizes("kids", ["circ", "height"], [["2-6 y", 48, 16], ["6-12 y", 52, 18]]),
      ...sizes("adults", ["circ", "height"], [["S", 56, 22], ["M", 60, 25], ["L", 64, 28], ["Long loop", 130, 30]]),
    ],
  },
  {
    id: "scarf",
    name: "Scarf",
    fields: [
      { key: "width", label: "Width, cm", initial: "20" },
      { key: "length", label: "Length, cm", initial: "150" },
      ...gaugeFields,
    ],
    presets: [yarnPresets],
    build: (v) => result({ ...scarfPattern(v.width, v.length, gauge(v)), chart: shapeChart([{ kind: "garter", rows: rowsOf(v.length, v) }]) }, gauge(v)),
    sizes: [
      ...sizes("babies", ["width", "length"], [["0-24 mo", 10, 60]]),
      ...sizes("kids", ["width", "length"], [["2-6 y", 12, 90], ["6-12 y", 15, 120]]),
      ...sizes("adults", ["width", "length"], [["Skinny", 15, 150], ["Classic", 20, 170], ["Wide", 30, 190]]),
    ],
  },
  {
    id: "dog-sweater",
    name: "Dog sweater",
    fields: [
      { key: "neck", label: "Neck circumference, cm", initial: "28" },
      { key: "chest", label: "Chest circumference, cm", initial: "50" },
      { key: "back", label: "Back length, cm", initial: "35" },
      ...gaugeFields,
    ],
    presets: [yarnPresets],
    build: (v) => {
      const total = rowsOf(v.back, v);
      const chart = shapeChart([
        { kind: "rib", rows: 6 },
        { kind: "increase", rows: Math.max(2, total / 4) },
        { kind: "knit", rows: Math.max(1, total / 2) },
        { kind: "rib", rows: 4 },
      ]);
      return result({ ...dogSweaterPattern(v.neck, v.chest, v.back, gauge(v)), chart }, gauge(v));
    },
    sizes: sizes("dogs", ["neck", "chest", "back"], [
      ["XS", 20, 32, 20], ["S", 26, 42, 28], ["M", 32, 54, 38], ["L", 40, 68, 48], ["XL", 48, 82, 58],
    ]),
  },
  {
    id: "sweater",
    name: "Cable sweater",
    fields: [
      { key: "chest", label: "Chest circumference, cm", initial: "92" },
      { key: "length", label: "Body length, cm", initial: "66" },
      { key: "st", label: "Gauge: stitches per 10 cm", initial: "12" },
      { key: "rows", label: "Gauge: rows per 10 cm", initial: "16" },
    ],
    presets: [SIZES.map(([name, lo, hi, length]) => ({ label: name, values: { chest: (lo + hi) / 2, length } })), yarnPresets],
    build: (v) => result(sweaterPattern(v.chest, v.length, gauge(v)), gauge(v)),
    sizes: SIZES.map(([label, lo, hi, length]) => ({ group: "adults", label, values: { chest: (lo + hi) / 2, length } })),
  },
];
