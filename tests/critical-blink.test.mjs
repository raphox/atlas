import test from "node:test";
import assert from "node:assert/strict";
import { createCriticalBlink } from "../src/critical-blink.js";

test("empresas críticas possuem ritmos distintos e intervalos irregulares sem transições graduais", () => {
  const patterns = [];
  for (let company = 0; company < 30; company++) {
    const blink = createCriticalBlink(`empresa-${company}`),
      changes = [];
    let previous = blink(0),
      pattern = String(previous);
    for (let frame = 1; frame <= 6000; frame++) {
      const t = frame / 100,
        on = blink(t);
      assert.equal(typeof on, "boolean");
      if (on !== previous) {
        changes.push(t);
        previous = on;
      }
      if (frame % 10 === 0) pattern += Number(on);
    }
    assert.ok(changes.length > 30);
    const intervals = changes.slice(1).map((t, i) => t - changes[i]);
    assert.ok(intervals.every((d) => d >= 0.439 && d <= 1.111));
    assert.ok(Math.max(...intervals) - Math.min(...intervals) > 0.2);
    patterns.push(pattern);
  }
  assert.equal(new Set(patterns).size, patterns.length);
});

test("fachada e telhado mantêm o mesmo ritmo após reconstruções e saltos de quadros", () => {
  const body = createCriticalBlink("empresa-crítica"),
    roof = createCriticalBlink("empresa-crítica");
  for (const t of [0, 0.1, 0.8, 12, 85, 10000, 3])
    assert.equal(body(t), roof(t));
});
