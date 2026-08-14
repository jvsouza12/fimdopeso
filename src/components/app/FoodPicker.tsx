import { useMemo, useState } from "react";
import { Search, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { scaleFood, round } from "@/lib/nutrition";
import type { Food, MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FOOD_CATEGORIES } from "@/data/foods";
import { toast } from "sonner";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
  extra: "Outras",
};

export function FoodPicker({ meal, onAdded }: { meal: MealType; onAdded?: () => void }) {
  const { allFoods, state, update, addLog } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount] = useState(100);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allFoods
      .filter((f) => (cat ? f.category === cat : true))
      .filter((f) => (term ? f.name.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const fa = state.favorites.includes(a.id) ? 0 : 1;
        const fb = state.favorites.includes(b.id) ? 0 : 1;
        return fa - fb || a.name.localeCompare(b.name);
      })
      .slice(0, 40);
  }, [allFoods, q, cat, state.favorites]);

  const macros = selected ? scaleFood(selected, amount) : null;

  const toggleFav = (id: string) =>
    update((d) => ({
      ...d,
      favorites: d.favorites.includes(id) ? d.favorites.filter((x) => x !== id) : [...d.favorites, id],
    }));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar alimento (ex.: frango)"
          className="h-12 pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={cat === null} onClick={() => setCat(null)}>
          Todos
        </Chip>
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {selected ? (
        <div className="card-surface space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.category}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Trocar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, +e.target.value))}
              className="h-11 w-28"
            />
            <span className="text-sm text-muted-foreground">
              {selected.unit === "un" ? "unidade(s)" : selected.unit}
            </span>
            <div className="ml-auto flex gap-1.5">
              {(selected.unit === "un" ? [1, 2, 3] : [50, 100, 200]).map((v) => (
                <Chip key={v} active={amount === v} onClick={() => setAmount(v)}>
                  {v}
                </Chip>
              ))}
            </div>
          </div>

          {macros ? (
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                ["kcal", round(macros.kcal)],
                ["Prot", `${round(macros.protein, 1)}g`],
                ["Carb", `${round(macros.carbs, 1)}g`],
                ["Gord", `${round(macros.fat, 1)}g`],
                ["Fibra", `${round(macros.fiber, 1)}g`],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-surface-2 p-2">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="text-sm font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          ) : null}

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              addLog({ meal, food: selected, amount });
              toast.success(`${selected.name} adicionado em ${MEAL_LABELS[meal]}`);
              setSelected(null);
              setAmount(100);
              onAdded?.();
            }}
          >
            <Plus className="size-4" /> Adicionar em {MEAL_LABELS[meal]}
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {results.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  setSelected(f);
                  setAmount(f.unit === "un" ? 1 : 100);
                }}
              >
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {round(f.kcal)} kcal · {round(f.protein, 1)}P · {round(f.carbs, 1)}C · {round(f.fat, 1)}G / {f.portion}
                  {f.unit === "un" ? " un" : f.unit}
                </p>
              </button>
              <button onClick={() => toggleFav(f.id)} aria-label="Favoritar">
                <Star
                  className={cn(
                    "size-4",
                    state.favorites.includes(f.id) ? "fill-warning text-warning" : "text-muted-foreground",
                  )}
                />
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum alimento encontrado.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
