import { cableChart, CABLE_REPEAT_WIDTH, type Chart } from "./chart.ts";
import type { Gauge } from "./hat.ts";
import type { Pattern } from "./patterns.ts";

export interface SweaterPattern extends Pattern {
  table: string[][]; // first row is the header
  chart: Chart;
}

// Standard adult sizes: [name, body chest low, high, body length], cm.
export const SIZES: [string, number, number, number][] = [
  ["S", 84, 90, 64],
  ["M", 94, 100, 66],
  ["L", 104, 110, 68],
  ["XL", 114, 120, 70],
];

const EASE = 0.12; // oversized fit
const RIB_CM = 6;
const SLEEVE_CM = 45; // underarm to cuff, ponytail: fixed for every size

const roundTo = (n: number, m: number) => Math.max(m, Math.round(n / m) * m);

// ponytail: simple drop-shoulder pullover (body in the round, flat from the underarm, flat sleeves). Proportions are fixed ratios of the chest, not drafted per size.
function sizes(chestCm: number, g: Gauge) {
  const st = (cm: number) => (cm / 10) * g.stitchesPer10cm;
  const rows = (cm: number) => Math.round((cm / 10) * g.rowsPer10cm);
  const finished = chestCm * (1 + EASE);
  const body = roundTo(st(finished), 4);
  const armhole = Math.round(finished * 0.23);
  const wrist = roundTo(st(finished * 0.19), 2);
  const top = roundTo(st(armhole * 2 + 4), 2);
  const sleeveRows = rows(SLEEVE_CM - RIB_CM);
  const incRounds = (top - wrist) / 2;
  return { finished, body, armhole, wrist, top, sleeveRows, incRounds, st, rows };
}

export function sweaterPattern(chestCm: number, lengthCm: number, g: Gauge): SweaterPattern {
  if ([chestCm, lengthCm, g.stitchesPer10cm, g.rowsPer10cm].some((v) => !(v > 0))) throw new Error("measurements and gauge must be positive");
  const s = sizes(chestCm, g);
  const half = s.body / 2;
  const reps = Math.floor(s.body / CABLE_REPEAT_WIDTH);
  const purlEdge = (s.body - reps * CABLE_REPEAT_WIDTH) / 2;
  const bodyRows = s.rows(lengthCm - RIB_CM - s.armhole);
  const yoke = s.rows(s.armhole);
  const neck = roundTo(s.st(s.finished * 0.2), 2);
  const stitchTotal = s.body * s.rows(lengthCm) + 2 * ((s.wrist + s.top) / 2) * s.rows(SLEEVE_CM);

  const table = [["Size", "Chest (body)", "Length", "Cast on"]];
  for (const [name, lo, hi, len] of SIZES) {
    const z = sizes((lo + hi) / 2, g);
    table.push([name, `${lo}-${hi} cm`, `${len} cm`, `${z.body} st`]);
  }

  return {
    stitchTotal,
    finished: [`Chest about ${Math.round(s.finished)} cm (body ${chestCm} cm plus ${EASE * 100}% ease)`, `Length about ${lengthCm} cm`, `Sleeve length about ${SLEEVE_CM} cm`],
    table,
    chart: cableChart(),
    steps: [
      `Body: cast on ${s.body} stitches, join in the round without twisting. Work k2p2 rib for ${RIB_CM} cm.`,
      `Cable pattern: work the chart ${reps} times across the round${purlEdge ? `, then purl the remaining ${purlEdge * 2} stitches (${purlEdge} at each side of the round)` : ""}. Repeat chart rows 1-8 for ${bodyRows} rounds, about ${lengthCm - RIB_CM - s.armhole} cm from the rib.`,
      `Divide for front and back: ${half} stitches each. Work back and forth, keeping the pattern, for ${yoke} rows (${s.armhole} cm).`,
      `Neck: on the front, in the last 6 rows put the middle ${neck} stitches on a holder and finish each side separately; back neck the same. Bind off the shoulders.`,
      `Sleeves (make 2): cast on ${s.wrist} stitches, k2p2 rib for ${RIB_CM} cm. Work in stockinette, increase 1 stitch at each end every ${Math.max(1, Math.floor(s.sleeveRows / s.incRounds))} rows ${s.incRounds} times to ${s.top} stitches. Continue straight to ${SLEEVE_CM} cm, bind off.`,
      "Finish: sew the shoulders, set in the sleeves, sew the sleeve and side seams.",
      `Neckband: pick up about ${neck * 2 + 4} stitches around the neck, k2p2 rib for 3 cm, bind off loosely in rib.`,
    ],
  };
}
