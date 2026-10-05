import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrompt } from "./prompt.ts";
import { castOnOf, metersOf, TEMPLATES } from "./templates.ts";

test("reads item, yarn weight and measurements in English and Russian", () => {
  assert.deepEqual(parsePrompt("A chunky ribbed beanie in charcoal, 56 cm"), { templateId: "hat", yarn: "Chunky", numbers: [56] });
  assert.deepEqual(parsePrompt("тонкий снуд 60 см на 25 см"), { templateId: "snood", yarn: "Fingering", numbers: [60, 25] });
  assert.equal(parsePrompt("super chunky scarf")!.yarn, "Super bulky");
  assert.equal(parsePrompt("свитер для собаки")!.templateId, "dog-sweater");
  assert.equal(parsePrompt("cable sweater, 96 cm chest")!.templateId, "sweater");
  assert.equal(parsePrompt("a lace shawl"), null);
});

test("hat chart: rib at the bottom, crown narrows to the top", () => {
  const rows = TEMPLATES[0].build({ head: 56, height: 22, st: 18, rows: 24 }).chart!.rows;
  assert.ok(rows.length <= 24);
  assert.deepEqual(rows[0].slice(0, 4), ["k", "k", "p", "p"]);
  const width = (r: string[]) => r.filter((c) => c !== "none").length;
  assert.ok(width(rows.at(-1)!) < width(rows[0]));
  assert.ok(rows.some((r) => r.includes("dec")));
});

test("every template has sizes; every size builds, bigger sizes need more stitches and yarn", () => {
  for (const t of TEMPLATES) {
    const base = Object.fromEntries(t.fields.map((f) => [f.key, Number(f.initial)]));
    const built = t.sizes.map((s) => t.build({ ...base, ...s.values }));
    assert.ok(built.length > 0, t.id);
    assert.ok(built.every((r) => castOnOf(r) > 0 && metersOf(r) > 0), t.id);
    assert.ok(castOnOf(built.at(-1)!) > castOnOf(built[0]), t.id);
    assert.ok(metersOf(built.at(-1)!) > metersOf(built[0]), t.id);
  }
});
