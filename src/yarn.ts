import type { Gauge } from "./hat.ts";

// Craft Yarn Council standard yarn weights: typical stockinette gauge, needle size and yardage.
// ponytail: one typical value per weight, real yarns vary; always knit a swatch.
export interface YarnWeight {
  name: string;
  stitchesPer10cm: number;
  needleMm: number;
  metersPer100g: number;
}

export const YARN_WEIGHTS: YarnWeight[] = [
  { name: "Lace", stitchesPer10cm: 36, needleMm: 2, metersPer100g: 800 },
  { name: "Fingering", stitchesPer10cm: 30, needleMm: 2.75, metersPer100g: 400 },
  { name: "Sport", stitchesPer10cm: 24, needleMm: 3.5, metersPer100g: 300 },
  { name: "DK", stitchesPer10cm: 22, needleMm: 4, metersPer100g: 250 },
  { name: "Worsted", stitchesPer10cm: 18, needleMm: 5, metersPer100g: 200 },
  { name: "Chunky", stitchesPer10cm: 13, needleMm: 6.5, metersPer100g: 130 },
  { name: "Super bulky", stitchesPer10cm: 9, needleMm: 9, metersPer100g: 80 },
];

// Row gauge is about a third higher than stitch gauge in stockinette.
export const gaugeOf = (y: YarnWeight): Gauge => ({ stitchesPer10cm: y.stitchesPer10cm, rowsPer10cm: Math.round(y.stitchesPer10cm * 1.33) });

// The standard weight whose stitch gauge is closest to the one entered.
export const nearestYarn = (stitchesPer10cm: number) =>
  YARN_WEIGHTS.reduce((a, b) => (Math.abs(b.stitchesPer10cm - stitchesPer10cm) < Math.abs(a.stitchesPer10cm - stitchesPer10cm) ? b : a));
