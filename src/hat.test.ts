import { test } from "node:test";
import assert from "node:assert/strict";
import { hatPattern } from "./hat.ts";

const gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };

test("56 cm head, 20 st gauge: 104 stitches, 12 decrease rounds", () => {
  const p = hatPattern({ headCircumferenceCm: 56, heightCm: 22, gauge });
  assert.equal(p.castOn, 104); // 56 * 0.9 = 50.4 cm -> 100.8 st -> nearest multiple of 8
  assert.equal(p.crownDecreaseRounds, 12);
  assert.equal(p.bodyRounds, 62 - 24);
});

test("cast-on is always a multiple of 8", () => {
  for (const head of [40, 47, 52, 58, 63]) {
    assert.equal(hatPattern({ headCircumferenceCm: head, heightCm: 20, gauge }).castOn % 8, 0);
  }
});

test("denser yarn means more stitches", () => {
  const a = hatPattern({ headCircumferenceCm: 56, heightCm: 22, gauge }).castOn;
  const b = hatPattern({ headCircumferenceCm: 56, heightCm: 22, gauge: { stitchesPer10cm: 30, rowsPer10cm: 40 } }).castOn;
  assert.ok(b > a);
});

test("rejects non-positive input", () => {
  assert.throws(() => hatPattern({ headCircumferenceCm: 0, heightCm: 20, gauge }));
});
