import { hatPattern } from "./hat.ts";
import { dogSweaterPattern, scarfPattern, snoodPattern } from "./patterns.ts";

export interface Field {
  key: string;
  label: string;
  initial: string;
}

export interface Template {
  id: string;
  name: string;
  fields: Field[];
  build: (v: Record<string, number>) => string[];
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
    build: (v) => hatPattern({ headCircumferenceCm: v.head, heightCm: v.height, gauge: gauge(v) }).steps,
  },
  {
    id: "snood",
    name: "Snood",
    fields: [
      { key: "circ", label: "Circumference, cm", initial: "60" },
      { key: "height", label: "Height, cm", initial: "25" },
      ...gaugeFields,
    ],
    build: (v) => snoodPattern(v.circ, v.height, gauge(v)).steps,
  },
  {
    id: "scarf",
    name: "Scarf",
    fields: [
      { key: "width", label: "Width, cm", initial: "20" },
      { key: "length", label: "Length, cm", initial: "150" },
      ...gaugeFields,
    ],
    build: (v) => scarfPattern(v.width, v.length, gauge(v)).steps,
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
    build: (v) => dogSweaterPattern(v.neck, v.chest, v.back, gauge(v)).steps,
  },
];
