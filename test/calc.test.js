import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRatio, formatRatio, waterForDose, doseForWater, ratioOf, bloomWater, estimateBeverage, forBeverage,
  espressoYield, extractionYield, tdsForExtraction, assessFilter, celsiusToFahrenheit, fahrenheitToCelsius, round,
} from "../src/index.js";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("parseRatio reads the common spellings", () => {
  assert.equal(parseRatio(16), 16);
  assert.equal(parseRatio("16"), 16);
  assert.equal(parseRatio("1:16"), 16);
  assert.equal(parseRatio("1：16"), 16);
  assert.equal(parseRatio("1/16"), 16);
  assert.equal(parseRatio("1 to 16"), 16);
  assert.equal(parseRatio("1比16"), 16);
  assert.equal(parseRatio("1:15.5"), 15.5);
  close(parseRatio("15:250"), 250 / 15);
  close(parseRatio("2:1"), 0.5);
});

test("parseRatio rejects nonsense", () => {
  assert.throws(() => parseRatio("strong"), RangeError);
  assert.throws(() => parseRatio("0"), RangeError);
  assert.throws(() => parseRatio("1:0"), RangeError);
  assert.throws(() => parseRatio(-3), RangeError);
  assert.throws(() => parseRatio(null), TypeError);
});

test("formatRatio", () => {
  assert.equal(formatRatio(16), "1:16");
  assert.equal(formatRatio(250 / 15), "1:16.7");
  assert.equal(formatRatio(2), "1:2");
});

test("dose ↔ water", () => {
  assert.equal(waterForDose(15, "1:16"), 240);
  assert.equal(doseForWater(500, 16), 31.25);
  assert.equal(ratioOf(20, 320), 16);
  // Round trip.
  close(doseForWater(waterForDose(18.5, 15.5), 15.5), 18.5);
  assert.throws(() => waterForDose(0, 16), RangeError);
  assert.throws(() => waterForDose("15", 16), TypeError);
});

test("bloom water", () => {
  assert.equal(bloomWater(15), 30);
  assert.equal(bloomWater(20, 3), 60);
});

test("beverage estimates allow for water kept by the grounds", () => {
  assert.equal(estimateBeverage(250, 15), 220);
  assert.equal(estimateBeverage(250, 15, 0), 250);
  assert.equal(estimateBeverage(20, 15), 0);
  const { doseG, waterG } = forBeverage(300, 16);
  close(estimateBeverage(waterG, doseG), 300, 1e-9);
  assert.equal(round(doseG), 21.4);
  assert.throws(() => forBeverage(300, 2), RangeError);
});

test("espresso yield", () => {
  assert.equal(espressoYield(18), 36);
  assert.equal(espressoYield(18, "1:2.5"), 45);
});

test("extraction yield and its inverse", () => {
  close(extractionYield({ doseG: 20, beverageG: 320, tdsPercent: 1.3 }), 20.8);
  close(tdsForExtraction({ doseG: 20, beverageG: 320, extractionYieldPercent: 20.8 }), 1.3);
  // Espresso: 18 g in, 36 g out at 10% TDS is 20% extraction.
  close(extractionYield({ doseG: 18, beverageG: 36, tdsPercent: 10 }), 20);
});

test("assessFilter follows the SCA control chart bands", () => {
  assert.deepEqual(assessFilter({ tdsPercent: 1.25, extractionYieldPercent: 20 }), { strength: "ideal", extraction: "ideal" });
  assert.deepEqual(assessFilter({ tdsPercent: 1.1, extractionYieldPercent: 17 }), { strength: "weak", extraction: "under" });
  assert.deepEqual(assessFilter({ tdsPercent: 1.45, extractionYieldPercent: 23 }), { strength: "strong", extraction: "over" });
  assert.deepEqual(assessFilter({ tdsPercent: 1.15, extractionYieldPercent: 22 }), { strength: "ideal", extraction: "ideal" });
});

test("temperature conversion", () => {
  assert.equal(celsiusToFahrenheit(100), 212);
  assert.equal(fahrenheitToCelsius(32), 0);
  close(fahrenheitToCelsius(celsiusToFahrenheit(93)), 93);
  assert.equal(round(celsiusToFahrenheit(93), 0), 199);
});
