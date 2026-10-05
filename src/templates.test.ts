import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES } from "./templates.ts";

test("every template builds steps from its own default field values", () => {
  for (const t of TEMPLATES) {
    const values = Object.fromEntries(t.fields.map((f) => [f.key, Number(f.initial)]));
    const steps = t.build(values);
    assert.ok(steps.length >= 3, t.id);
  }
});
