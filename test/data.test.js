import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { METHODS, GRIND_SIZES, STANDARDS } from "../src/index.js";

const json = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));

test("data/*.json matches src/data.js (run `npm run export` after editing)", () => {
  assert.deepEqual(json("methods.json"), METHODS);
  assert.deepEqual(json("grind-sizes.json"), GRIND_SIZES);
  assert.deepEqual(json("standards.json"), STANDARDS);
});

test("covers the main brewing methods", () => {
  const ids = METHODS.map((m) => m.id);
  for (const id of ["v60", "kalita", "chemex", "aeropress", "french-press", "espresso", "cold-brew", "cold-brew-concentrate", "moka-pot"]) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
});

const inRange = (r) => r.min <= r.start && r.start <= r.max;

test("every range is ordered and its starting point lies inside it", () => {
  for (const m of METHODS) {
    assert.ok(inRange(m.ratio), `${m.id} ratio`);
    assert.ok(inRange(m.doseG), `${m.id} dose`);
    if (m.waterTempC) assert.ok(inRange(m.waterTempC), `${m.id} temp`);
    assert.ok(m.brewTimeSec.min <= m.brewTimeSec.max, `${m.id} time`);
    if (m.steepSec) assert.ok(inRange(m.steepSec), `${m.id} steep`);
    if (m.bloom) assert.ok(inRange(m.bloom.waterPerGram) && inRange(m.bloom.timeSec), `${m.id} bloom`);
    assert.ok(["water", "beverage"].includes(m.ratioBasis));
    assert.ok(GRIND_SIZES.some((g) => g.id === m.grind), `${m.id} grind`);
    assert.ok(m.zh && m.name && Array.isArray(m.tips) && m.tips.length);
  }
});

test("sanity: values sit inside physically sensible bounds", () => {
  for (const m of METHODS) {
    if (m.waterTempC) assert.ok(m.waterTempC.min >= 0 && m.waterTempC.max <= 100, m.id);
    if (m.ratioBasis === "beverage") assert.ok(m.ratio.max <= 4, `${m.id} espresso-style ratio`);
    else assert.ok(m.ratio.min >= 3 && m.ratio.max <= 20, `${m.id} water ratio`);
  }
  // Hot filter methods sit inside the SCA Golden Cup temperature window.
  for (const id of ["v60", "kalita", "chemex", "french-press"]) {
    const t = METHODS.find((m) => m.id === id).waterTempC;
    assert.ok(t.min >= STANDARDS.goldenCup.waterTempC.min && t.max <= STANDARDS.goldenCup.waterTempC.max, id);
  }
});

test("grind sizes are listed coarse to fine and every method has one", () => {
  assert.deepEqual(GRIND_SIZES.map((g) => g.id), ["extra-coarse", "coarse", "medium-coarse", "medium", "medium-fine", "fine", "extra-fine"]);
  const listed = GRIND_SIZES.flatMap((g) => g.methods);
  for (const m of METHODS) assert.ok(listed.includes(m.id), m.id);
  for (const g of GRIND_SIZES) for (const id of g.methods) assert.equal(METHODS.find((m) => m.id === id).grind, g.id);
});

test("golden cup ratio agrees with a 1:16.7–1:20 water ratio", () => {
  const { min, max } = STANDARDS.goldenCup.ratioGramsPerLiter;
  assert.equal(Math.round((1000 / max) * 10) / 10, 16.7);
  assert.equal(1000 / min, 20);
});
