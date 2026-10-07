// Builds a full starting recipe for a method, and scales recipes.

import { METHODS, GRIND_SIZES } from "./data.js";
import { parseRatio, formatRatio, round, estimateBeverage, celsiusToFahrenheit } from "./calc.js";

const POUR_INTERVAL_SEC = 30;

/** Finds a method by id, English or Chinese name, or alias. Case and spacing don't matter. */
export function getMethod(query) {
  if (typeof query !== "string") throw new TypeError("method must be a string");
  const key = query.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const loose = query.trim().toLowerCase();
  const hit = METHODS.find(
    (m) => m.id === key || m.name.toLowerCase() === loose || m.zh === query.trim() || m.aliases.includes(loose),
  );
  if (!hit) throw new RangeError(`unknown brew method "${query}". Known: ${METHODS.map((m) => m.id).join(", ")}`);
  return hit;
}

function outside(value, range) {
  return range && (value < range.min || value > range.max);
}

/**
 * A starting recipe for a method.
 *   recipe("v60")                         → the method's starting dose and ratio
 *   recipe("v60", { doseG: 20 })          → water from the ratio
 *   recipe("chemex", { waterG: 600 })     → dose from the ratio
 *   recipe("french-press", { doseG: 30, ratio: "1:14" })
 * Values outside the usual range still work and add a warning.
 */
export function recipe(method, options = {}) {
  const m = typeof method === "string" ? getMethod(method) : method;
  const ratio = options.ratio !== undefined ? parseRatio(options.ratio) : m.ratio.start;
  const warnings = [];
  let dose;
  if (options.doseG !== undefined && options.waterG !== undefined) {
    throw new RangeError("give doseG or waterG, not both (the ratio sets the other)");
  } else if (options.waterG !== undefined) {
    if (m.ratioBasis === "beverage") throw new RangeError(`${m.name} is set by dose and yield; give doseG`);
    dose = options.waterG / ratio;
  } else {
    dose = options.doseG ?? m.doseG.start;
  }
  if (!(dose > 0) || !Number.isFinite(dose)) throw new RangeError("dose must be greater than 0");

  if (outside(ratio, m.ratio)) {
    warnings.push(`${formatRatio(ratio)} is outside the usual ${formatRatio(m.ratio.min)}–${formatRatio(m.ratio.max)} for ${m.name}`);
  }
  if (outside(dose, m.doseG)) {
    warnings.push(`${round(dose)} g is outside the usual ${m.doseG.min}–${m.doseG.max} g for ${m.name}`);
  }

  const grind = GRIND_SIZES.find((g) => g.id === m.grind);
  const out = {
    method: m.id,
    name: m.name,
    zh: m.zh,
    ratio: round(ratio, 2),
    ratioText: formatRatio(ratio),
    ratioBasis: m.ratioBasis,
    doseG: round(dose),
    waterG: null,
    beverageG: null,
    grind: { id: grind.id, name: grind.name, zh: grind.zh, looksLike: grind.looksLike },
    waterTempC: m.waterTempC ? { ...m.waterTempC } : null,
    waterTempF: m.waterTempC
      ? { min: round(celsiusToFahrenheit(m.waterTempC.min), 0), max: round(celsiusToFahrenheit(m.waterTempC.max), 0), start: round(celsiusToFahrenheit(m.waterTempC.start), 0) }
      : null,
    brewTimeSec: { ...m.brewTimeSec },
    steepSec: m.steepSec ? { ...m.steepSec } : null,
    bloom: null,
    pours: [],
    dilution: null,
    tips: [...m.tips],
    warnings,
    startingPoint: true,
  };

  if (m.ratioBasis === "beverage") {
    out.beverageG = round(dose * ratio);
    if (m.pressureBar) out.pressureBar = m.pressureBar;
    return out;
  }

  const water = dose * ratio;
  out.waterG = round(water, 0);
  // The "grounds keep ~2 g per gram" estimate fits filter and immersion brews, not a moka pot.
  if (m.category !== "pressure") out.beverageG = round(estimateBeverage(water, dose), 0);

  if (m.bloom) {
    const bloomG = Math.min(water, dose * m.bloom.waterPerGram.start);
    out.bloom = { waterG: round(bloomG, 0), timeSec: m.bloom.timeSec.start };
    // Pours are cumulative targets on the scale: bloom first, then equal pours.
    out.pours.push({ atSec: 0, toG: round(bloomG, 0) });
    const rest = water - bloomG;
    for (let i = 1; i <= m.pours; i++) {
      out.pours.push({ atSec: m.bloom.timeSec.start + (i - 1) * POUR_INTERVAL_SEC, toG: round(bloomG + (rest * i) / m.pours, 0) });
    }
  }

  if (m.dilution) {
    const concentrate = estimateBeverage(water, dose);
    out.dilution = {
      partsWaterPerConcentrate: { ...m.dilution },
      concentrateG: round(concentrate, 0),
      addWaterG: round(concentrate * m.dilution.start, 0),
    };
  }
  return out;
}

/**
 * Scales a recipe to a new dose, water amount or factor, keeping the ratio.
 * Works on objects from recipe() and on plain { doseG, waterG } objects.
 * Times are not scaled: a much larger batch usually needs a slightly coarser grind or a little longer.
 */
export function scaleRecipe(r, target) {
  if (!r || typeof r !== "object") throw new TypeError("recipe must be an object");
  if (!target || typeof target !== "object") throw new TypeError("target must be { doseG } or { waterG } or { factor }");
  let factor;
  if (target.factor !== undefined) factor = target.factor;
  else if (target.doseG !== undefined) factor = target.doseG / r.doseG;
  else if (target.waterG !== undefined) {
    if (!r.waterG) throw new RangeError("this recipe has no water amount; scale by doseG or factor");
    factor = target.waterG / r.waterG;
  } else throw new TypeError("target must be { doseG } or { waterG } or { factor }");
  if (!(factor > 0) || !Number.isFinite(factor)) throw new RangeError("scale factor must be greater than 0");

  const g = (x, digits = 0) => (typeof x === "number" ? round(x * factor, digits) : x);
  const out = { ...r, doseG: g(r.doseG, 1) };
  if ("waterG" in r) out.waterG = g(r.waterG);
  if ("beverageG" in r) out.beverageG = g(r.beverageG, r.ratioBasis === "beverage" ? 1 : 0);
  if (r.bloom) out.bloom = { ...r.bloom, waterG: g(r.bloom.waterG) };
  if (Array.isArray(r.pours)) out.pours = r.pours.map((p) => ({ ...p, toG: g(p.toG) }));
  if (r.dilution) out.dilution = { ...r.dilution, concentrateG: g(r.dilution.concentrateG), addWaterG: g(r.dilution.addWaterG) };
  return out;
}
