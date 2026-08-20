import type { Food } from "./types";

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Converte um produto do Open Food Facts no formato de alimento do app (por 100 g/ml). */
export function mapOffProduct(p: OffProduct): Food | null {
  const name = (p.product_name_pt || p.product_name || "").trim();
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  if (!name || !kcal) return null;

  const category = (p.categories ?? "").split(",")[0]?.trim() || "Industrializados";

  return {
    id: `off:${p.code ?? name}`,
    name: p.brands ? `${name} (${p.brands.split(",")[0]?.trim()})` : name,
    category,
    portion: 100,
    unit: "g",
    kcal: Math.round(kcal),
    protein: num(n["proteins_100g"]),
    carbs: num(n["carbohydrates_100g"]),
    fat: num(n["fat_100g"]),
    fiber: num(n["fiber_100g"]),
    sugar: num(n["sugars_100g"]),
    sodium: Math.round(num(n["sodium_100g"]) * 1000),
    satFat: num(n["saturated-fat_100g"]),
    brand: p.brands?.split(",")[0]?.trim(),
    barcode: p.code,
    source: "off",
  };
}
