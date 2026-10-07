#!/usr/bin/env node
// Usage: node examples/cli.js <method> [dose g] [ratio]
//   node examples/cli.js v60 20
//   node examples/cli.js 法压壶 30 1:14
import { recipe, METHODS } from "../src/index.js";

const [method, dose, ratio] = process.argv.slice(2);
if (!method) {
  console.error(`usage: node examples/cli.js <method> [dose g] [ratio]\nmethods: ${METHODS.map((m) => m.id).join(", ")}`);
  process.exit(1);
}
const r = recipe(method, { ...(dose ? { doseG: Number(dose) } : {}), ...(ratio ? { ratio } : {}) });
const mmss = (s) => (s >= 3600 ? `${Math.round(s / 360) / 10} h` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

console.log(`${r.name} (${r.zh}) — starting point`);
console.log(`  coffee   ${r.doseG} g, ${r.grind.name.toLowerCase()} grind (${r.grind.looksLike})`);
if (r.waterG !== null) console.log(`  water    ${r.waterG} g  (${r.ratioText})`);
if (r.ratioBasis === "beverage") console.log(`  yield    ${r.beverageG} g in the cup  (${r.ratioText})`);
else if (r.beverageG !== null) console.log(`  in cup   ~${r.beverageG} g`);
if (r.waterTempC) console.log(`  temp     ${r.waterTempC.min}–${r.waterTempC.max} °C (start at ${r.waterTempC.start} °C / ${r.waterTempF.start} °F)`);
if (r.bloom) console.log(`  bloom    ${r.bloom.waterG} g for ${r.bloom.timeSec} s`);
for (const p of r.pours.slice(1)) console.log(`  ${mmss(p.atSec).padStart(5)}    pour to ${p.toG} g`);
if (r.steepSec) console.log(`  steep    ${mmss(r.steepSec.min)}–${mmss(r.steepSec.max)}`);
console.log(`  total    ${mmss(r.brewTimeSec.min)}–${mmss(r.brewTimeSec.max)}`);
if (r.dilution) console.log(`  dilute   ~${r.dilution.concentrateG} g concentrate with ~${r.dilution.addWaterG} g water or milk`);
for (const w of r.warnings) console.log(`  ! ${w}`);
for (const t of r.tips) console.log(`  · ${t}`);
