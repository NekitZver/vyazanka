import type { Gauge } from "./hat.ts";

export interface Pattern {
  stitchTotal: number;
  finished: string[];
  steps: string[];
}

const stitches = (cm: number, g: Gauge) => (cm / 10) * g.stitchesPer10cm;
const rows = (cm: number, g: Gauge) => Math.round((cm / 10) * g.rowsPer10cm);
const roundTo = (n: number, multiple: number) => Math.max(multiple, Math.round(n / multiple) * multiple);

function check(values: number[], gauge: Gauge) {
  if ([...values, gauge.stitchesPer10cm, gauge.rowsPer10cm].some((v) => !(v > 0))) {
    throw new Error("measurements and gauge must be positive");
  }
}

export function scarfPattern(widthCm: number, lengthCm: number, gauge: Gauge): Pattern {
  check([widthCm, lengthCm], gauge);
  const castOn = roundTo(stitches(widthCm, gauge), 2);
  return {
    stitchTotal: castOn * rows(lengthCm, gauge),
    finished: [`Width about ${widthCm} cm`, `Length about ${lengthCm} cm`],
    steps: [
      `Cast on ${castOn} stitches.`,
      `Knit every row (garter stitch) for ${rows(lengthCm, gauge)} rows, about ${lengthCm} cm.`,
      "Bind off loosely.",
    ],
  };
}

export function snoodPattern(circumferenceCm: number, heightCm: number, gauge: Gauge): Pattern {
  check([circumferenceCm, heightCm], gauge);
  const castOn = roundTo(stitches(circumferenceCm, gauge), 4); // multiple of 4 for 2x2 rib
  return {
    stitchTotal: castOn * rows(heightCm, gauge),
    finished: [`Circumference about ${circumferenceCm} cm`, `Height about ${heightCm} cm`],
    steps: [
      `Cast on ${castOn} stitches, join in the round.`,
      `Work k2, p2 rib for ${rows(heightCm, gauge)} rounds, about ${heightCm} cm.`,
      "Bind off loosely in rib.",
    ],
  };
}

// ponytail: basic top-down tube with simple leg openings, no shaped belly; refine with real dog fittings
export function dogSweaterPattern(neckCm: number, chestCm: number, backLengthCm: number, gauge: Gauge): Pattern {
  check([neckCm, chestCm, backLengthCm], gauge);
  const neck = roundTo(stitches(neckCm * 0.9, gauge), 4);
  const chest = roundTo(stitches(chestCm * 1.05, gauge), 4);
  if (chest <= neck) throw new Error("chest must be larger than neck");
  const collarRounds = 6;
  const increaseRounds = (chest - neck) / 4; // 4 stitches per increase round, every other round
  const total = rows(backLengthCm, gauge);
  const straight = Math.max(0, total - collarRounds - increaseRounds * 2);
  const legHole = roundTo(chest * 0.15, 2);
  const legHoleRounds = Math.max(2, Math.round(straight * 0.4));
  const stitchTotal = neck * collarRounds + ((neck + chest) / 2) * increaseRounds * 2 + chest * (straight + 4);
  return {
    stitchTotal,
    finished: [`Neck about ${neckCm} cm`, `Chest about ${chestCm} cm`, `Back length about ${backLengthCm} cm`],
    steps: [
      `Cast on ${neck} stitches, join in the round.`,
      `Rounds 1-${collarRounds}: rib (k2, p2).`,
      `Increase: repeat ${increaseRounds} times: round A increase 1 stitch at each of 4 evenly spaced points (4 stitches total), round B knit. You now have ${chest} stitches.`,
      `Knit ${straight} rounds straight, with leg openings in the first ${legHoleRounds}: bind off ${legHole} stitches on each side under the front legs, cast them on again in the next round.`,
      "Finish with 4 rounds of rib (k2, p2), bind off loosely.",
    ],
  };
}
