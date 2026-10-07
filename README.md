# coffee-brew-ratios

An open dataset and a tiny, dependency-free JavaScript library (ESM, with TypeScript types) for brewing coffee:

- **Data**: brew ratios, doses, grind sizes, water temperatures, bloom and brew times for V60, Kalita Wave, Chemex, AeroPress, French press, espresso, moka pot and cold brew (ready-to-drink and concentrate). There are also grind-size descriptions and SCA reference targets for brewed coffee and brewing water.
- **Calculators**: dose ↔ water for a ratio, bloom water, drink weight after the grounds absorb water, espresso yield, extraction yield from a TDS reading, and recipe scaling.

> **Every number here is a starting point, not a rule.** Beans, roast level, grinder and your taste move the right answer. Start in the middle of a range, taste, and change one thing at a time.

The data is also published as plain JSON in [`data/`](data), so you can use it from any language.

## Install

It is not published to npm. Clone it, or copy `src/` (or just `data/`) into your project:

```sh
git clone https://github.com/jackships/coffee-brew-ratios.git
cd coffee-brew-ratios
npm test
node examples/cli.js v60 20
node examples/cli.js 法压壶 30 1:14
```

## The starting points

Ratios are written **1 : N**. For filter, immersion, moka pot and cold brew, N is **grams of brewing water per gram of coffee**. For espresso, N is **grams of drink in the cup per gram of coffee** (`ratioBasis: "beverage"`).

| Method | Ratio (start) | Dose (start) | Grind | Water °C (start) | Time |
|---|---|---|---|---|---|
| V60 · V60 手冲 | 1:15–1:17 (1:16) | 15 g | medium-fine | 90–96 (93) | 2:30–3:30, bloom 2× dose for 30–45 s |
| Kalita Wave · 蛋糕滤杯 | 1:15–1:17 (1:16) | 20 g | medium | 90–96 (93) | 3:00–4:00, bloom 2× dose |
| Chemex | 1:15–1:17 (1:16) | 30 g | medium-coarse | 90–96 (94) | 4:00–5:30, bloom 2× dose |
| AeroPress · 爱乐压 | 1:12–1:16 (1:15) | 15 g | medium-fine | 80–96 (90) | 1:30–2:30 total |
| French press · 法压壶 | 1:12–1:16 (1:15) | 30 g | coarse | 90–96 (94) | 4–5 min steep |
| Espresso · 意式浓缩 | 1:1.5–1:2.5 out (1:2) | 18 g | fine | 90–96 (93) | 25–30 s, ~9 bar |
| Moka pot · 摩卡壶 | ~1:7–1:10 (1:9) | set by the basket | fine (coarser than espresso) | start with hot water | 4–6 min |
| Cold brew · 冷萃 | 1:10–1:15 (1:12) | 80 g | extra-coarse | 2–22 (fridge) | 12–24 h |
| Cold brew concentrate · 冷萃浓缩液 | 1:4–1:8 (1:5) | 100 g | extra-coarse | 2–22 (fridge) | 12–24 h, then dilute 1:1–1:2 |

Reference targets (`STANDARDS`), mostly from the Specialty Coffee Association:

- **Golden Cup** (filter coffee): 50–60 g of coffee per litre of water (about 1:16.7–1:20), 90–96 °C, TDS 1.15–1.35%, extraction yield 18–22%.
- **Brewing water** (approximate): TDS ~150 mg/L (75–250), calcium hardness ~68 mg/L (17–85), alkalinity ~40 mg/L, pH ~7 (6.5–7.5), sodium ~10 mg/L, no chlorine.
- **Absorption**: wet grounds keep roughly 2 g of water per gram of coffee.

Grind sizes run from coarse to fine: extra-coarse (cracked peppercorns), coarse (coarse sea salt), medium-coarse (rough sand), medium (regular sand), medium-fine (a little coarser than table salt), fine (table salt or finer), extra-fine (flour). Grinder settings are not comparable between models, so the dataset uses descriptions instead of clicks or microns.

## Usage

```js
import {
  recipe, scaleRecipe, waterForDose, doseForWater, parseRatio, bloomWater,
  forBeverage, extractionYield, assessFilter, METHODS,
} from "./src/index.js";

waterForDose(15, "1:16");   // 240
doseForWater(500, 16);      // 31.25
parseRatio("15:250");       // 16.67 (also "1:16", "1/16", "1比16", 16)
bloomWater(20);             // 40 (2× the dose; pass 3 for 3×)

// "I want 300 g in the cup": allows for the water the grounds keep.
forBeverage(300, 16);       // { doseG: 21.4…, waterG: 342.9… }

recipe("v60", { doseG: 20 });
// {
//   method: "v60", ratioText: "1:16", doseG: 20, waterG: 320, beverageG: 280,
//   grind: { id: "medium-fine", looksLike: "a little coarser than table salt", … },
//   waterTempC: { min: 90, max: 96, start: 93 }, waterTempF: { …, start: 199 },
//   bloom: { waterG: 40, timeSec: 40 },
//   pours: [ { atSec: 0, toG: 40 }, { atSec: 40, toG: 180 }, { atSec: 70, toG: 320 } ],
//   warnings: [], startingPoint: true, …
// }

recipe("espresso");                          // 18 g in → 36 g out
recipe("chemex", { waterG: 600 });           // dose from the ratio: 37.5 g
recipe("v60", { ratio: "1:20" }).warnings;   // ["1:20 is outside the usual 1:15–1:17 for Hario V60"]

scaleRecipe(recipe("v60"), { waterG: 480 }); // dose 30 g, every pour target doubled, times unchanged

// With a refractometer reading:
const ey = extractionYield({ doseG: 20, beverageG: 300, tdsPercent: 1.35 }); // 20.25 (%)
assessFilter({ tdsPercent: 1.35, extractionYieldPercent: ey });             // { strength: "ideal", extraction: "ideal" }
```

`getMethod()` accepts ids, English names and aliases, and Chinese names (`"法压壶"`, `"爱乐压"`, `"冷萃"`).

### What is well defined and what is an estimate

- **Exact**: dose ↔ water ↔ ratio, bloom water, espresso yield, extraction yield `EY% = drink g × TDS% ÷ dose g` and its inverse, °C ↔ °F.
- **Estimates**: drink weight for filter and immersion brews (it assumes ~2 g of water kept per gram of coffee) and `forBeverage()`. A moka pot gets no drink-weight estimate.
- **Not covered**: brew strength without a TDS reading, caffeine content, and grinder-specific settings.

## Data files

| File | Contents |
|---|---|
| [`data/methods.json`](data/methods.json) | One object per method: ratio, dose, grind, temperature, times, bloom, tips, English and Chinese names, aliases |
| [`data/grind-sizes.json`](data/grind-sizes.json) | Seven grind sizes, coarse to fine, with comparisons and the methods that use them |
| [`data/standards.json`](data/standards.json) | Golden Cup and water targets, plus the absorption constant |

The source of truth is `src/data.js`. After you edit it, run `npm run export`. A test fails if the JSON and the JS disagree.

## Tests

`npm test` runs 26 tests with the built-in `node:test` and needs no dependencies. They check the calculators against hand-worked examples, check that every range is ordered and contains its starting point, and check that the JSON is in sync.

## 中文说明

按冲煮方式整理的咖啡**粉水比、粉量、研磨度、水温、闷蒸和萃取时间**开放数据集（V60、Kalita、Chemex、爱乐压、法压壶、意式浓缩、摩卡壶、冷萃），附带一个零依赖的计算小库：粉量和水量互算、闷蒸水量、杯中液重估算、意式出液量、用 TDS 算萃取率，以及按粉量或水量缩放配方。

所有数值都只是**起点**。豆子、烘焙度、磨豆机和个人口味都会改变答案：先从区间中间开始，喝一口，再一次只调一个变量。

---

Brew notes like these are what Cuppa (咖啡手帐), an iOS coffee diary, is built to log. It is not on the App Store yet: https://y1y2u3u4.github.io/cuppa/support.html

## License

MIT © 2026 Jack Ships
