// Writes the dataset in src/data.js to data/*.json. Run: npm run export
import { writeFileSync } from "node:fs";
import { METHODS, GRIND_SIZES, STANDARDS } from "../src/data.js";

const files = { "methods.json": METHODS, "grind-sizes.json": GRIND_SIZES, "standards.json": STANDARDS };
for (const [name, value] of Object.entries(files)) {
  writeFileSync(new URL(`../data/${name}`, import.meta.url), JSON.stringify(value, null, 2) + "\n");
  console.log(`wrote data/${name}`);
}
