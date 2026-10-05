import { test } from "node:test";
import assert from "node:assert/strict";
import { sweaterPattern, SIZES } from "./sweater.ts";
import { cableChart, CABLE_REPEAT_WIDTH } from "./chart.ts";

const g = { stitchesPer10cm: 12, rowsPer10cm: 16 };

test("sweater cast-on follows chest plus ease, rounded to 4", () => {
  const p = sweaterPattern(92, 66, g); // 92 * 1.12 = 103 cm * 1.2 = 124 stitches
  assert.match(p.steps[0], /cast on 124 stitches/i);
  assert.ok(p.stitchTotal > 10000);
});

test("size table has a row per size and grows with chest", () => {
  const p = sweaterPattern(92, 66, g);
  assert.equal(p.table.length, SIZES.length + 1);
  const caston = p.table.slice(1).map((r) => parseInt(r[3]));
  assert.deepEqual(caston, [...caston].sort((a, b) => a - b));
});

test("cable chart is rectangular and crosses once per repeat", () => {
  const c = cableChart();
  assert.ok(c.rows.every((r) => r.length === CABLE_REPEAT_WIDTH));
  assert.equal(c.rows.filter((r) => r.includes("x")).length, 1);
});

test("sweater rejects bad input", () => {
  assert.throws(() => sweaterPattern(0, 66, g));
});
