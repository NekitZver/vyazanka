// Stitch chart for knitting in the round: every row is a right-side row, read right to left.
export type Stitch = "k" | "p" | "x"; // knit, purl, cable cross
export interface Chart {
  rows: Stitch[][]; // rows[0] is row 1 (bottom of the chart)
  legend: Record<Stitch, string>;
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
