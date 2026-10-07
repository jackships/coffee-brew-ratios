import { test } from "node:test";
import assert from "node:assert/strict";
import { getMethod, recipe, scaleRecipe, METHODS } from "../src/index.js";

test("getMethod finds ids, names and aliases in English and Chinese", () => {
  assert.equal(getMethod("v60").id, "v60");
  assert.equal(getMethod("French Press").id, "french-press");
  assert.equal(getMethod("french_press").id, "french-press");
  assert.equal(getMethod("法压壶").id, "french-press");
  assert.equal(getMethod("爱乐压").id, "aeropress");
  assert.equal(getMethod("Bialetti").id, "moka-pot");
  assert.equal(getMethod("冷萃").id, "cold-brew");
  assert.throws(() => getMethod("siphon"), RangeError);
});

test("every method gives a complete starting recipe", () => {
  for (const m of METHODS) {
    const r = recipe(m.id);
    assert.equal(r.method, m.id);
    assert.equal(r.startingPoint, true);
    assert.ok(r.doseG > 0);
    assert.deepEqual(r.warnings, [], `${m.id} defaults should be inside its own ranges`);
    if (r.ratioBasis === "water") assert.equal(r.waterG, Math.round(r.doseG * r.ratio));
    else assert.equal(r.beverageG, r.doseG * r.ratio);
  }
});

test("V60: water, bloom and pours", () => {
  const r = recipe("v60", { doseG: 20 });
  assert.equal(r.ratioText, "1:16");
  assert.equal(r.waterG, 320);
  assert.equal(r.beverageG, 280);
  assert.deepEqual(r.bloom, { waterG: 40, timeSec: 40 });
  assert.deepEqual(r.pours, [
    { atSec: 0, toG: 40 },
    { atSec: 40, toG: 180 },
    { atSec: 70, toG: 320 },
  ]);
  assert.equal(r.grind.id, "medium-fine");
});

test("a recipe from a water amount", () => {
  const r = recipe("chemex", { waterG: 600 });
  assert.equal(r.doseG, 37.5);
  assert.equal(r.waterG, 600);
  assert.equal(r.pours.at(-1).toG, 600);
});

test("custom ratios outside the usual range still work but warn", () => {
  const r = recipe("french-press", { doseG: 30, ratio: "1:14" });
  assert.equal(r.waterG, 420);
  assert.deepEqual(r.warnings, []);
  const weak = recipe("v60", { ratio: "1:20" });
  assert.equal(weak.warnings.length, 1);
  assert.match(weak.warnings[0], /1:20 is outside the usual 1:15–1:17/);
});

test("espresso is dose and yield", () => {
  const r = recipe("espresso");
  assert.equal(r.doseG, 18);
  assert.equal(r.beverageG, 36);
  assert.equal(r.waterG, null);
  assert.equal(r.pressureBar, 9);
  assert.throws(() => recipe("espresso", { waterG: 40 }), RangeError);
  assert.equal(recipe("espresso", { doseG: 20, ratio: 2.5 }).beverageG, 50);
});

test("cold brew concentrate includes dilution", () => {
  const r = recipe("cold-brew-concentrate", { doseG: 100 });
  assert.equal(r.waterG, 500);
  assert.equal(r.dilution.concentrateG, 300);
  assert.equal(r.dilution.addWaterG, 300);
  assert.equal(r.steepSec.min, 12 * 3600);
});

test("moka pot has no fixed temperature and no beverage estimate", () => {
  const r = recipe("moka-pot");
  assert.equal(r.waterTempC, null);
  assert.equal(r.beverageG, null);
  assert.equal(r.waterG, 144);
});

test("recipe input errors", () => {
  assert.throws(() => recipe("v60", { doseG: 15, waterG: 250 }), RangeError);
  assert.throws(() => recipe("v60", { doseG: 0 }), RangeError);
  assert.throws(() => recipe("v60", { ratio: "strong" }), RangeError);
});

test("scaleRecipe keeps the ratio and scales every weight", () => {
  const base = recipe("v60");
  const big = scaleRecipe(base, { waterG: 480 });
  assert.equal(big.doseG, 30);
  assert.equal(big.waterG, 480);
  assert.equal(big.ratio, base.ratio);
  assert.deepEqual(big.pours.map((p) => p.toG), [60, 270, 480]);
  assert.deepEqual(big.pours.map((p) => p.atSec), base.pours.map((p) => p.atSec));
  assert.equal(big.bloom.waterG, 60);
  assert.deepEqual(scaleRecipe(base, { doseG: 7.5 }).waterG, 120);
  assert.deepEqual(scaleRecipe({ doseG: 20, waterG: 300 }, { factor: 1.5 }), { doseG: 30, waterG: 450 });
  assert.equal(scaleRecipe(recipe("espresso"), { doseG: 20 }).beverageG, 40);
  assert.throws(() => scaleRecipe(recipe("espresso"), { waterG: 40 }), RangeError);
  assert.throws(() => scaleRecipe(base, { factor: 0 }), RangeError);
});
