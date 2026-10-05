import { test } from "node:test";
import assert from "node:assert/strict";
import { dogSweaterPattern, scarfPattern, snoodPattern } from "./patterns.ts";

const g = { stitchesPer10cm: 20, rowsPer10cm: 28 };

test("scarf: 20 cm wide at 20 st/10cm casts on 40", () => {
  assert.match(scarfPattern(20, 150, g).steps[0], /Cast on 40 /);
  assert.match(scarfPattern(20, 150, g).steps[1], /420 rows/);
});

test("snood: cast-on is a multiple of 4", () => {
  for (const c of [50, 56, 61, 70]) {
    assert.match(snoodPattern(c, 25, g).steps[0], /Cast on (\d+)/);
    assert.equal(Number(snoodPattern(c, 25, g).steps[0].match(/Cast on (\d+)/)![1]) % 4, 0);
  }
});

test("dog sweater: 28 cm neck, 50 cm chest, 35 cm back", () => {
  const steps = dogSweaterPattern(28, 50, 35, g).steps;
  assert.match(steps[0], /Cast on 52 /); // 28*0.9*2 = 50.4 -> 52
  assert.match(steps[2], /repeat 13 times/);
  assert.match(steps[2], /You now have 104 stitches/); // 50*1.05*2 = 105 -> 104
});

test("dog sweater rejects chest not larger than neck", () => {
  assert.throws(() => dogSweaterPattern(50, 40, 30, g));
});

test("non-positive input is rejected", () => {
  assert.throws(() => scarfPattern(0, 100, g));
  assert.throws(() => snoodPattern(50, -1, g));
});
