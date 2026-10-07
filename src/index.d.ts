export interface Range { min: number; max: number; start: number }
export interface MinMax { min: number; max: number }

export type MethodId =
  | "v60" | "kalita" | "chemex" | "aeropress" | "french-press"
  | "espresso" | "moka-pot" | "cold-brew" | "cold-brew-concentrate";

export type GrindId = "extra-coarse" | "coarse" | "medium-coarse" | "medium" | "medium-fine" | "fine" | "extra-fine";

export interface Method {
  id: MethodId;
  name: string;
  zh: string;
  aliases: string[];
  category: "pour-over" | "immersion" | "pressure" | "cold";
  /** "water": 1:N = N g brewing water per g coffee. "beverage": 1:N = N g drink per g coffee (espresso). */
  ratioBasis: "water" | "beverage";
  ratio: Range;
  doseG: Range;
  grind: GrindId;
  waterTempC: Range | null;
  brewTimeSec: MinMax;
  bloom: { waterPerGram: Range; timeSec: Range } | null;
  pours?: number;
  steepSec?: Range;
  pressureBar?: number;
  dilution?: Range;
  tips: string[];
}

export interface GrindSize { id: GrindId; name: string; zh: string; looksLike: string; looksLikeZh: string; methods: MethodId[] }

export const METHODS: Method[];
export const GRIND_SIZES: GrindSize[];
export const STANDARDS: {
  goldenCup: {
    source: string;
    ratioGramsPerLiter: { min: number; max: number; target: number };
    waterTempC: { min: number; max: number; target: number };
    tdsPercent: MinMax;
    extractionYieldPercent: MinMax;
    appliesTo: string;
  };
  water: Record<string, unknown>;
  groundsAbsorptionGPerG: number;
};

export type RatioInput = number | string;

export function round(x: number, digits?: number): number;
export function parseRatio(input: RatioInput): number;
export function formatRatio(n: number, digits?: number): string;
export function waterForDose(doseG: number, ratio: RatioInput): number;
export function doseForWater(waterG: number, ratio: RatioInput): number;
export function ratioOf(doseG: number, waterG: number): number;
export function bloomWater(doseG: number, waterPerGram?: number): number;
export function estimateBeverage(waterG: number, doseG: number, absorption?: number): number;
export function forBeverage(beverageG: number, ratio: RatioInput, absorption?: number): { doseG: number; waterG: number };
export function espressoYield(doseG: number, ratio?: RatioInput): number;
export function extractionYield(input: { doseG: number; beverageG: number; tdsPercent: number }): number;
export function tdsForExtraction(input: { doseG: number; beverageG: number; extractionYieldPercent: number }): number;
export function assessFilter(input: { tdsPercent: number; extractionYieldPercent: number }): {
  strength: "weak" | "ideal" | "strong";
  extraction: "under" | "ideal" | "over";
};
export function celsiusToFahrenheit(c: number): number;
export function fahrenheitToCelsius(f: number): number;

export interface Recipe {
  method: MethodId;
  name: string;
  zh: string;
  ratio: number;
  ratioText: string;
  ratioBasis: "water" | "beverage";
  doseG: number;
  waterG: number | null;
  beverageG: number | null;
  grind: { id: GrindId; name: string; zh: string; looksLike: string };
  waterTempC: Range | null;
  waterTempF: Range | null;
  brewTimeSec: MinMax;
  steepSec: Range | null;
  bloom: { waterG: number; timeSec: number } | null;
  /** Cumulative scale targets: pour until the scale reads `toG` starting at `atSec`. */
  pours: { atSec: number; toG: number }[];
  dilution: { partsWaterPerConcentrate: Range; concentrateG: number; addWaterG: number } | null;
  pressureBar?: number;
  tips: string[];
  warnings: string[];
  startingPoint: true;
}

export function getMethod(query: string): Method;
export function recipe(method: MethodId | string | Method, options?: { doseG?: number; waterG?: number; ratio?: RatioInput }): Recipe;
export function scaleRecipe<T extends { doseG: number; waterG?: number | null }>(
  recipe: T,
  target: { doseG: number } | { waterG: number } | { factor: number },
): T;
