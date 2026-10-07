// Small, exact calculators. All weights are grams; 1 g of water is treated as 1 ml.

import { STANDARDS } from "./data.js";

function num(x, name) {
  if (typeof x !== "number" || !Number.isFinite(x)) throw new TypeError(`${name} must be a finite number`);
  return x;
}

function positive(x, name) {
  num(x, name);
  if (x <= 0) throw new RangeError(`${name} must be greater than 0`);
  return x;
}

/** Rounds to `digits` decimals (default 1). */
export function round(x, digits = 1) {
  const f = 10 ** digits;
  return Math.round((x + Number.EPSILON) * f) / f;
}

/**
 * Reads a ratio and returns N in "1 : N".
 * Accepts 16, "16", "1:16", "1：16", "1/16", "1 to 16", "1比16", and dose:water pairs like "15:250" (→ 16.67).
 */
export function parseRatio(input) {
  if (typeof input === "number") return positive(input, "ratio");
  if (typeof input !== "string") throw new TypeError("ratio must be a number or a string");
  const s = input.trim().replace(/：/g, ":");
  let m = s.match(/^(\d+(?:\.\d+)?)\s*(?::|\/|比|to)\s*(\d+(?:\.\d+)?)$/i);
  if (m) return positive(Number(m[2]) / positive(Number(m[1]), "ratio"), "ratio");
  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return positive(Number(m[1]), "ratio");
  throw new RangeError(`cannot read ratio "${input}"`);
}

/** 16 → "1:16", 16.666 → "1:16.7". */
export function formatRatio(n, digits = 1) {
  return `1:${round(positive(n, "ratio"), digits)}`;
}

/** Brewing water for a dose: 15 g at 1:16 → 240 g. */
export function waterForDose(doseG, ratio) {
  return positive(doseG, "dose") * parseRatio(ratio);
}

/** Coffee for an amount of brewing water: 500 g at 1:16 → 31.25 g. */
export function doseForWater(waterG, ratio) {
  return positive(waterG, "water") / parseRatio(ratio);
}

/** The ratio N of a brew: 20 g coffee, 320 g water → 16. */
export function ratioOf(doseG, waterG) {
  return positive(waterG, "water") / positive(doseG, "dose");
}

/** Bloom water: by default twice the dose (common range 2–3×). */
export function bloomWater(doseG, waterPerGram = 2) {
  return positive(doseG, "dose") * positive(waterPerGram, "waterPerGram");
}

/**
 * Estimated drink weight for a filter or immersion brew: the grounds hold back about 2 g of water per gram.
 * 15 g coffee + 250 g water → about 220 g in the cup.
 */
export function estimateBeverage(waterG, doseG, absorption = STANDARDS.groundsAbsorptionGPerG) {
  return Math.max(0, positive(waterG, "water") - positive(doseG, "dose") * num(absorption, "absorption"));
}

/**
 * Dose and water for a wanted amount in the cup (filter or immersion), allowing for what the grounds keep.
 * 300 g in the cup at 1:16 → 21.4 g coffee, 342.9 g water.
 */
export function forBeverage(beverageG, ratio, absorption = STANDARDS.groundsAbsorptionGPerG) {
  const n = parseRatio(ratio);
  const keep = num(absorption, "absorption");
  if (n <= keep) throw new RangeError("ratio must be larger than the absorption");
  const dose = positive(beverageG, "beverage") / (n - keep);
  return { doseG: dose, waterG: dose * n };
}

/** Espresso yield (drink weight) for a dose and a brew ratio: 18 g at 1:2 → 36 g. */
export function espressoYield(doseG, ratio = 2) {
  return positive(doseG, "dose") * parseRatio(ratio);
}

/**
 * Extraction yield in percent: how much of the coffee's mass ended up dissolved in the drink.
 *   EY% = beverage (g) × TDS (%) ÷ dose (g)
 * TDS comes from a refractometer. 20 g, 320 g in the cup, 1.30% TDS → 20.8%.
 */
export function extractionYield({ doseG, beverageG, tdsPercent }) {
  return (positive(beverageG, "beverageG") * positive(tdsPercent, "tdsPercent")) / positive(doseG, "doseG");
}

/** The TDS (%) that a given extraction yield implies. */
export function tdsForExtraction({ doseG, beverageG, extractionYieldPercent }) {
  return (positive(extractionYieldPercent, "extractionYieldPercent") * positive(doseG, "doseG")) / positive(beverageG, "beverageG");
}

/**
 * Places a FILTER coffee on the SCA brewing control chart: strength from TDS, extraction from EY.
 * Not meant for espresso.
 */
export function assessFilter({ tdsPercent, extractionYieldPercent }) {
  const { tdsPercent: t, extractionYieldPercent: e } = STANDARDS.goldenCup;
  const tds = num(tdsPercent, "tdsPercent");
  const ey = num(extractionYieldPercent, "extractionYieldPercent");
  return {
    strength: tds < t.min ? "weak" : tds > t.max ? "strong" : "ideal",
    extraction: ey < e.min ? "under" : ey > e.max ? "over" : "ideal",
  };
}

export const celsiusToFahrenheit = (c) => (num(c, "celsius") * 9) / 5 + 32;
export const fahrenheitToCelsius = (f) => ((num(f, "fahrenheit") - 32) * 5) / 9;
