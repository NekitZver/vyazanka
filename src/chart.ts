// Stitch chart for knitting in the round: every row is a right-side row, read right to left.
export type Stitch = "k" | "p" | "x" | "dec" | "inc" | "none"; // knit, purl, cable cross, k2tog, increase, no stitch
export interface Chart {
  rows: Stitch[][]; // rows[0] is row 1 (bottom of the chart)
  legend: Partial<Record<Stitch, string>>;
}

const CABLE = 6; // stitches per cable
const GAP = 4; // purl stitches between cables, and on each edge
const REPEAT_ROWS = 8; // the cable crosses on row 7 of every 8

export const CABLE_REPEAT_WIDTH = 2 * (CABLE + GAP);

// Two 6-stitch cables on a reverse stockinette background.
export function cableChart(): Chart {
  const row = (cross: boolean): Stitch[] => {
    const cable: Stitch[] = Array(CABLE).fill(cross ? "x" : "k");
    const gap: Stitch[] = Array(GAP).fill("p");
    return [...gap, ...cable, ...gap, ...cable];
  };
  return {
    rows: Array.from({ length: REPEAT_ROWS }, (_, i) => row(i === 6)),
    legend: { k: "Knit", p: "Purl", x: "Cable: slip 3 to cable needle at front, k3, k3 from cable needle" },
  };
}

export interface Segment {
  kind: "rib" | "knit" | "garter" | "decrease" | "increase";
  rows: number; // real number of rows or rounds; the chart scales them down
}

const SHAPE_WIDTH = 16; // stitches shown: a multiple of 4 so k2, p2 rib lines up
const MAX_ROWS = 24;

// Schematic of the whole piece, one repeat wide: rib, plain rounds, and the shaping, so the chart shows the real shape.
export function shapeChart(segments: Segment[]): Chart {
  const total = segments.reduce((s, x) => s + x.rows, 0);
  const scale = Math.min(1, MAX_ROWS / total);
  const rows: Stitch[][] = [];
  for (const seg of segments) {
    const n = Math.max(seg.kind === "rib" || seg.kind === "garter" ? 2 : 1, Math.round(seg.rows * scale));
    let width = SHAPE_WIDTH;
    for (let r = 0; r < n; r++) {
      const row: Stitch[] = [];
      for (let c = 0; c < SHAPE_WIDTH; c++) {
        if (c >= width) row.push("none");
        else if (seg.kind === "rib") row.push(c % 4 < 2 ? "k" : "p");
        else if (seg.kind === "garter") row.push(r % 2 ? "p" : "k");
        else if (seg.kind === "decrease" && r % 2 === 0 && c === width - 1) row.push("dec");
        else if (seg.kind === "increase" && r % 2 === 0 && c === width - 1) row.push("inc");
        else row.push("k");
      }
      rows.push(row);
      // the crown narrows as it is decreased
      if (seg.kind === "decrease" && r % 2 === 0) width = Math.max(2, width - Math.ceil((SHAPE_WIDTH - 2) / Math.ceil(n / 2)));
    }
  }
  const used = new Set(rows.flat());
  const names: Partial<Record<Stitch, string>> = { k: "Knit", p: "Purl", dec: "k2tog (decrease)", inc: "Increase 1 stitch" };
  return { rows, legend: Object.fromEntries(Object.entries(names).filter(([k]) => used.has(k as Stitch))) };
}
