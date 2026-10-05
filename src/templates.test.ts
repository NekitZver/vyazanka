import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES } from "./templates.ts";

test("every template builds steps from its own default field values", () => {
  for (const t of TEMPLATES) {
    const values = Object.fromEntries(t.fields.map((f) => [f.key, Number(f.initial)]));
    const r = t.build(values);
    assert.ok(r.steps.length >= 3, t.id);
    assert.ok(r.finished.length >= 2 && r.materials.length === 2 && r.notes.length > 0, t.id);
  }
});

test("yarn estimate is plausible and grows with size", () => {
  const hat = TEMPLATES[0];
  const meters = (head: number) => Number(hat.build({ head, height: 22, st: 20, rows: 28 }).materials[0].match(/about (\d+) m/)![1]);
  assert.ok(meters(56) > 60 && meters(56) < 250, String(meters(56))); // an adult hat is roughly 100-200 m
  assert.ok(meters(64) > meters(52));
});

test("materials name the closest standard yarn weight and a skein count", () => {
  const hat = TEMPLATES[0];
  assert.match(hat.build({ head: 56, height: 22, st: 18, rows: 24 }).materials[0], /\d+ x 100 g of Worsted/);
  assert.match(hat.build({ head: 56, height: 22, st: 9, rows: 12 }).materials[1], /9 mm for Super bulky/);
});

test("every preset only fills fields its template has", () => {
  for (const t of TEMPLATES) {
    const keys = new Set(t.fields.map((f) => f.key));
    for (const p of t.presets.flat()) assert.ok(Object.keys(p.values).every((k) => keys.has(k)), `${t.id} ${p.label}`);
  }
});
