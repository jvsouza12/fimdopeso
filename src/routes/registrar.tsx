import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/app/AppShell";
import { FoodPicker, MEAL_LABELS } from "@/components/app/FoodPicker";
import { OnlineFoods } from "@/components/app/OnlineFoods";
import { PhotoMeal } from "@/components/app/PhotoMeal";
import { PremiumGate } from "@/components/app/PremiumGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { round, scaleFood } from "@/lib/nutrition";
import { FOOD_CATEGORIES, FOOD_MAP } from "@/data/foods";
import { todayKey, addDays } from "@/lib/date";
import type { MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Repeat } from "lucide-react";

const searchSchema = z.object({ meal: z.enum(["breakfast", "lunch", "snack", "dinner", "extra"]).optional() });

export const Route = createFileRoute("/registrar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Registrar refeição — NutriPlan" },
      { name: "description", content: "Pesquise alimentos, ajuste a quantidade e registre sua refeição em segundos." },
      { property: "og:title", content: "Registrar refeição — NutriPlan" },
      { property: "og:description", content: "Registro rápido de alimentos com cálculo automático de macros." },
    ],
  }),
  component: RegistrarPage,
});

const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner", "extra"];

function RegistrarPage() {
  const { meal: initialMeal } = Route.useSearch();
  const [meal, setMeal] = useState<MealType>(initialMeal ?? "lunch");
  const { state, update, addLog } = useStore();
  const today = todayKey();
  const todayLogs = state.logs.filter((l) => l.date === today);
  const yesterdayLogs = state.logs.filter((l) => l.date === addDays(today, -1));

  return (
    <div className="space-y-6">
      <PageHeader title="Registrar" subtitle="Adicione o que você comeu em poucos segundos." />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              meal === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
            )}
          >
            {MEAL_LABELS[m]}
          </button>
        ))}
      </div>

      <Tabs defaultValue="buscar">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="buscar" className="flex-1">Buscar</TabsTrigger>
          <TabsTrigger value="online" className="flex-1">Produtos</TabsTrigger>
          <TabsTrigger value="codigo" className="flex-1">Código</TabsTrigger>
          <TabsTrigger value="foto" className="flex-1">Foto</TabsTrigger>
          <TabsTrigger value="receitas" className="flex-1">Receitas</TabsTrigger>
          <TabsTrigger value="criar" className="flex-1">Criar</TabsTrigger>
        </TabsList>

        <TabsContent value="buscar" className="mt-4">
          <FoodPicker meal={meal} />
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <OnlineFoods meal={meal} mode="search" />
        </TabsContent>

        <TabsContent value="codigo" className="mt-4">
          <PremiumGate
            title="Código de barras"
            description="Leia o código de barras do produto e registre a refeição em segundos."
          >
            <OnlineFoods meal={meal} mode="barcode" />
          </PremiumGate>
        </TabsContent>

        <TabsContent value="foto" className="mt-4">
          <PremiumGate
            title="Foto do prato"
            description="Tire uma foto da refeição e deixe a IA estimar os alimentos e as calorias."
          >
            <PhotoMeal meal={meal} />
          </PremiumGate>
        </TabsContent>

        <TabsContent value="receitas" className="mt-4 space-y-3">
          {state.recipes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma receita criada ainda. Crie em "Receitas".</p>
          )}
          {state.recipes.map((r) => {
            const total = r.ingredients.reduce(
              (acc, ing) => {
                const food = FOOD_MAP.get(ing.foodId) ?? state.customFoods.find((f) => f.id === ing.foodId);
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
            const perServing = {
              kcal: total.kcal / r.servings,
              protein: total.protein / r.servings,
              carbs: total.carbs / r.servings,
              fat: total.fat / r.servings,
              fiber: total.fiber / r.servings,
            };
            return (
              <div key={r.id} className="card-surface flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {round(perServing.kcal)} kcal por porção · {round(perServing.protein)}P
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    addLog({ meal, recipeId: r.id, name: `${r.name} (1 porção)`, amount: 1, macros: perServing });
                    toast.success("Receita adicionada");
                  }}
                >
                  Adicionar
                </Button>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="criar" className="mt-4">
          <CustomFoodForm />
        </TabsContent>
      </Tabs>

      {yesterdayLogs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Repetir de ontem</h2>
          <div className="flex flex-wrap gap-2">
            {yesterdayLogs.slice(0, 8).map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  addLog({
                    meal: l.meal,
                    amount: l.amount,
                    name: l.name,
                    macros: { kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat, fiber: l.fiber },
                  });
                  toast.success("Registrado novamente");
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs"
              >
                <Repeat className="size-3" /> {l.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Registrado hoje</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {todayLogs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nada registrado ainda hoje.</p>
          )}
          {todayLogs.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {MEAL_LABELS[l.meal]} · {round(l.amount)} · {round(l.kcal)} kcal
                </p>
              </div>
              <button
                aria-label="Remover"
                onClick={() => update((d) => ({ ...d, logs: d.logs.filter((x) => x.id !== l.id) }))}
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CustomFoodForm() {
  const { update } = useStore();
  const [form, setForm] = useState({
    name: "",
    category: FOOD_CATEGORIES[0]!,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    portion: 100,
  });

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="card-surface space-y-4 p-4">
      <div className="space-y-2">
        <Label>Nome do alimento</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FOOD_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => set("category", c)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                form.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            ["portion", "Porção (g/ml)"],
            ["kcal", "Calorias"],
            ["protein", "Proteína (g)"],
            ["carbs", "Carboidrato (g)"],
            ["fat", "Gordura (g)"],
            ["fiber", "Fibras (g)"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="space-y-2">
            <Label>{label}</Label>
            <Input type="number" value={form[k]} onChange={(e) => set(k, Math.max(0, +e.target.value))} />
          </div>
        ))}
      </div>
      <Button
        className="w-full"
        onClick={() => {
          if (!form.name.trim()) {
            toast.error("Informe o nome do alimento");
            return;
          }
          update((d) => ({
            ...d,
            customFoods: [{ id: crypto.randomUUID(), unit: "g", custom: true, ...form }, ...d.customFoods],
          }));
          toast.success("Alimento criado");
          setForm({ ...form, name: "", kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
        }}
      >
        Salvar alimento
      </Button>
    </div>
  );
}
