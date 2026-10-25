import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { MEAL_LABELS } from "@/components/app/FoodPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { round, scaleFood } from "@/lib/nutrition";
import { WEEKDAYS } from "@/lib/date";
import type { MealType, PlanEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dieta")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Minha dieta — CasalPlan" },
      { name: "description", content: "Planeje suas refeições da semana e veja o total de calorias e macros de cada dia." },
      { property: "og:title", content: "Minha dieta — CasalPlan" },
      { property: "og:description", content: "Monte sua dieta semanal com cálculo automático de calorias." },
    ],
  }),
  component: DietaPage,
});

const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner", "extra"];

function DietaPage() {
  const { state, update, allFoods, addLog } = useStore();
  const { targets } = useProfile();
  const [day, setDay] = useState(new Date().getDay());
  const [adding, setAdding] = useState<MealType | null>(null);
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState(100);

  const dayPlan = state.plan.filter((p) => p.weekday === day);

  const macrosOf = (entry: PlanEntry) => {
    const food = allFoods.find((f) => f.id === entry.foodId);
    if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return scaleFood(food, entry.amount);
  };

  const dayTotals = dayPlan.reduce(
    (a, e) => {
      const m = macrosOf(e);
      return { kcal: a.kcal + m.kcal, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat };
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  const results = q.trim()
    ? allFoods.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Minha dieta" subtitle="Planeje o que vai comer e siga com tranquilidade." />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {WEEKDAYS.map((w, i) => (
          <button
            key={w}
            onClick={() => setDay(i)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
              day === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
            )}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="card-surface p-5">
        <p className="text-sm text-muted-foreground">Total planejado para {WEEKDAYS[day]}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {round(dayTotals.kcal)} <span className="text-base font-normal text-muted-foreground">/ {targets.kcal} kcal</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {round(dayTotals.p)}g proteína · {round(dayTotals.c)}g carbo · {round(dayTotals.f)}g gordura
        </p>
      </div>

      <div className="space-y-3">
        {MEALS.map((meal) => {
          const items = dayPlan.filter((p) => p.meal === meal);
          return (
            <div key={meal} className="card-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{MEAL_LABELS[meal]}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAdding(adding === meal ? null : meal);
                    setQ("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <ul className="mt-2 space-y-1.5">
                {items.map((i) => {
                  const m = macrosOf(i);
                  return (
                    <li key={i.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {i.name} · {i.amount}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{round(m.kcal)} kcal</span>
                      <button
                        aria-label="Remover"
                        onClick={() => update((d) => ({ ...d, plan: d.plan.filter((x) => x.id !== i.id) }))}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="text-xs text-muted-foreground">Nada planejado.</li>}
              </ul>

              {items.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    items.forEach((i) => {
                      const food = allFoods.find((f) => f.id === i.foodId);
                      if (food) addLog({ meal, food, amount: i.amount });
                    });
                    toast.success("Refeição planejada registrada em hoje");
                  }}
                >
                  Registrar como feito hoje
                </Button>
              )}

              {adding === meal && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento" />
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, +e.target.value))}
                      className="w-24"
                    />
                  </div>
                  <ul className="space-y-1">
                    {results.map((f) => (
                      <li key={f.id}>
                        <button
                          className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
                          onClick={() => {
                            update((d) => ({
                              ...d,
                              plan: [
                                ...d.plan,
                                {
                                  id: crypto.randomUUID(),
                                  weekday: day,
                                  meal,
                                  foodId: f.id,
                                  name: f.name,
                                  amount,
                                },
                              ],
                            }));
                            setQ("");
                            setAdding(null);
                          }}
                        >
                          {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
