import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2, Plus, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScanner } from "./BarcodeScanner";
import { EmptyState } from "./EmptyState";
import { MEAL_LABELS } from "./FoodPicker";
import { searchOnlineFoods, lookupBarcode } from "@/lib/foods.functions";
import { useStore } from "@/lib/store";
import { round, scaleFood } from "@/lib/nutrition";
import type { Food, MealType } from "@/lib/types";

/** Busca em base online de alimentos (Open Food Facts) + leitura de código de barras. */
export function OnlineFoods({ meal, mode }: { meal: MealType; mode: "search" | "barcode" }) {
  const search = useServerFn(searchOnlineFoods);
  const lookup = useServerFn(lookupBarcode);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Food[] | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);

  const runSearch = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await search({ data: { query: q.trim() } });
      setResults(res.foods as Food[]);
      if (res.error) toast.error("Base online indisponível agora. Tente a busca do app.");
    } catch {
      toast.error("Não foi possível buscar agora.");
    } finally {
      setLoading(false);
    }
  };

  const runBarcode = async (code: string) => {
    setLoading(true);
    try {
      const res = await lookup({ data: { code } });
      if (!res.food) {
        toast.error(res.error === "not_found" ? "Produto não encontrado nessa base." : "Base indisponível agora.");
        return;
      }
      setSelected(res.food as Food);
      toast.success("Produto encontrado");
    } catch {
      toast.error("Código inválido ou base indisponível.");
    } finally {
      setLoading(false);
    }
  };

  if (selected) return <ConfirmFood food={selected} meal={meal} onDone={() => setSelected(null)} />;

  if (mode === "barcode") {
    return (
      <div className="space-y-4">
        <BarcodeScanner onCode={runBarcode} busy={loading} />
        {loading ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Consultando produto…
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            placeholder="Buscar produto (ex.: iogurte natural)"
            className="h-12 pl-9"
            aria-label="Buscar produto na base online"
          />
        </div>
        <Button className="h-12" onClick={() => void runSearch()} disabled={loading || q.trim().length < 2}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      {results === null ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          title="Milhares de produtos de mercado"
          description="Busque por marca ou nome do produto para trazer as informações nutricionais do rótulo."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          title="Nada encontrado"
          description="Tente outro nome, use o código de barras ou cadastre o alimento manualmente."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {results.map((f) => (
            <li key={f.id}>
              <button className="w-full px-4 py-3 text-left" onClick={() => setSelected(f)}>
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {round(f.kcal)} kcal · {round(f.protein, 1)}P · {round(f.carbs, 1)}C · {round(f.fat, 1)}G / 100 g
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmFood({ food, meal, onDone }: { food: Food; meal: MealType; onDone: () => void }) {
  const { addLog, update, state } = useStore();
  const [amount, setAmount] = useState(100);
  const m = scaleFood(food, amount);

  return (
    <div className="card-surface space-y-4 p-4">
      <div>
        <p className="font-semibold">{food.name}</p>
        <p className="text-xs text-muted-foreground">
          {food.category}
          {food.barcode ? ` · ${food.barcode}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Math.max(0, +e.target.value))}
          className="h-11 w-28"
          aria-label="Quantidade em gramas"
        />
        <span className="text-sm text-muted-foreground">{food.unit}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["kcal", round(m.kcal)],
          ["Prot", `${round(m.protein, 1)}g`],
          ["Carb", `${round(m.carbs, 1)}g`],
          ["Fibra", `${round(m.fiber, 1)}g`],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-surface-2 p-2">
            <p className="text-[11px] text-muted-foreground">{l}</p>
            <p className="text-sm font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Açúcares {round(m.sugar, 1)} g · Gordura saturada {round(m.satFat, 1)} g · Sódio {round(m.sodium)} mg
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            addLog({ meal, food, amount });
            if (!state.customFoods.some((f) => f.id === food.id)) {
              update((d) => ({ ...d, customFoods: [food, ...d.customFoods] }));
            }
            toast.success(`${food.name} adicionado em ${MEAL_LABELS[meal]}`);
            onDone();
          }}
        >
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
