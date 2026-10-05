import { hatPattern, type Gauge } from "./hat.ts";
import { sweaterPattern, SIZES } from "./sweater.ts";
import { gaugeOf, nearestYarn, YARN_WEIGHTS } from "./yarn.ts";
import type { Chart } from "./chart.ts";
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

export interface Template {
  id: string;
  name: string;
  fields: Field[];
  build: (v: Record<string, number>) => Result;
  presets: Preset[][]; // groups of buttons that fill in fields
}

const gaugeFields: Field[] = [
  { key: "st", label: "Gauge: stitches per 10 cm", initial: "20" },
  { key: "rows", label: "Gauge: rows per 10 cm", initial: "28" },
];
const gauge = (v: Record<string, number>) => ({ stitchesPer10cm: v.st, rowsPer10cm: v.rows });

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
    build: (v) => result(hatPattern({ headCircumferenceCm: v.head, heightCm: v.height, gauge: gauge(v) }), gauge(v)),
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
    build: (v) => result(snoodPattern(v.circ, v.height, gauge(v)), gauge(v)),
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
    build: (v) => result(scarfPattern(v.width, v.length, gauge(v)), gauge(v)),
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
    build: (v) => result(dogSweaterPattern(v.neck, v.chest, v.back, gauge(v)), gauge(v)),
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
  },
];
