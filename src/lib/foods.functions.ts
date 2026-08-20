import { createServerFn } from "@tanstack/react-start";
import { mapOffProduct, type OffProduct } from "./off";

const UA = "NutriPlan/1.0 (app de dieta)";

/** Busca alimentos na base pública Open Food Facts (milhares de produtos, inclusive do Brasil). */
export const searchOnlineFoods = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input?.query ?? "").trim().slice(0, 60);
    if (query.length < 2) throw new Error("Busca muito curta");
    return { query };
  })
  .handler(async ({ data }) => {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        search_terms: data.query,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: "24",
        lc: "pt",
        fields:
          "code,product_name,product_name_pt,brands,categories,nutriments,serving_quantity,quantity",
      }).toString();

    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return { foods: [], error: "unavailable" as const };
      const json = (await res.json()) as { products?: OffProduct[] };
      const foods = (json.products ?? []).map(mapOffProduct).filter((f) => f !== null);
      return { foods, error: null };
    } catch (err) {
      console.error("Open Food Facts search failed", err);
      return { foods: [], error: "unavailable" as const };
    }
  });

/** Consulta um produto pelo código de barras (EAN/UPC). */
export const lookupBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    const code = String(input?.code ?? "").replace(/\D/g, "").slice(0, 14);
    if (code.length < 8) throw new Error("Código de barras inválido");
    return { code };
  })
  .handler(async ({ data }) => {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${data.code}.json?` +
      new URLSearchParams({
        fields:
          "code,product_name,product_name_pt,brands,categories,nutriments,serving_quantity,quantity",
      }).toString();

    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return { food: null, error: "unavailable" as const };
      const json = (await res.json()) as { status?: number; product?: OffProduct };
      if (json.status !== 1 || !json.product) return { food: null, error: "not_found" as const };
      const food = mapOffProduct(json.product);
      if (!food) return { food: null, error: "not_found" as const };
      return { food, error: null };
    } catch (err) {
      console.error("Open Food Facts barcode failed", err);
      return { food: null, error: "unavailable" as const };
    }
  });
