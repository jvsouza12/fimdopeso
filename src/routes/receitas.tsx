import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { round, scaleFood } from "@/lib/nutrition";
import type { RecipeIngredient } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas — NutriPlan" },
      { name: "description", content: "Crie receitas com vários ingredientes e veja calorias e macros calculados automaticamente." },
      { property: "og:title", content: "Receitas — NutriPlan" },
      { property: "og:description", content: "Monte receitas e adicione às refeições em um toque." },
    ],
  }),
  component: ReceitasPage,
});

function ReceitasPage() {
  const { state, update, allFoods } = useStore();
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [ings, setIngs] = useState<RecipeIngredient[]>([]);
  const [q, setQ] = useState("");
  const [amount, setAmount] = useState(100);

  const results = q.trim()
    ? allFoods.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : [];

  const totalOf = (list: RecipeIngredient[]) =>
    list.reduce(
      (acc, ing) => {
        const food = allFoods.find((f) => f.id === ing.foodId);
        if (!food) return acc;
        const m = scaleFood(food, ing.amount);
        return {
          kcal: acc.kcal + m.kcal,
          protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs,
          fat: acc.fat + m.fat,
          fiber: acc.fiber + m.fiber,
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );

  const total = totalOf(ings);

  return (
    <div className="space-y-6">
      <PageHeader title="Receitas" subtitle="Monte uma vez, use sempre." />

      <div className="card-surface space-y-4 p-4">
        <p className="font-semibold">Nova receita</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Frango com arroz" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label>Porções</Label>
            <Input type="number" value={servings} onChange={(e) => setServings(Math.max(1, +e.target.value))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Adicionar ingrediente</Label>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento" />
            <Input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, +e.target.value))} className="w-24" />
          </div>
          {results.length > 0 && (
            <ul className="overflow-hidden rounded-xl border border-border">
              {results.map((f) => (
                <li key={f.id}>
                  <button
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setIngs((p) => [...p, { foodId: f.id, amount }]);
                      setQ("");
                    }}
                  >
                    {f.name}
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ings.length > 0 && (
          <ul className="space-y-1.5">
            {ings.map((i, idx) => {
              const food = allFoods.find((f) => f.id === i.foodId);
              return (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span>
                    {i.amount} {food?.unit === "un" ? "un" : food?.unit} de {food?.name}
                  </span>
                  <button onClick={() => setIngs((p) => p.filter((_, k) => k !== idx))}>
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            ["kcal", round(total.kcal)],
            ["Prot", `${round(total.protein)}g`],
            ["Carb", `${round(total.carbs)}g`],
            ["Gord", `${round(total.fat)}g`],
            ["Fibra", `${round(total.fiber)}g`],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-surface-2 p-2">
              <p className="text-[11px] text-muted-foreground">{l}</p>
              <p className="text-sm font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={() => {
            if (!name.trim() || ings.length === 0) {
              toast.error("Informe nome e ao menos um ingrediente");
              return;
            }
            update((d) => ({
              ...d,
              recipes: [{ id: crypto.randomUUID(), name: name.trim(), servings, ingredients: ings }, ...d.recipes],
            }));
            setName("");
            setIngs([]);
            setServings(1);
            toast.success("Receita salva");
          }}
        >
          Salvar receita
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Minhas receitas</h2>
        {state.recipes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma receita ainda.</p>}
        {state.recipes.map((r) => {
          const t = totalOf(r.ingredients);
          return (
            <div key={r.id} className="card-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.ingredients.length} ingredientes · {round(t.kcal / r.servings)} kcal por porção
                  </p>
                </div>
                <button onClick={() => update((d) => ({ ...d, recipes: d.recipes.filter((x) => x.id !== r.id) }))}>
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
