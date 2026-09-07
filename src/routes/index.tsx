import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Droplets, Plus, Timer, TrendingDown } from "lucide-react";
import { useStore, useDayTotals } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { Ring, MacroBar } from "@/components/app/Ring";
import { MEAL_LABELS } from "@/components/app/FoodPicker";
import { Button } from "@/components/ui/button";
import { todayKey, lastNDays } from "@/lib/date";
import { round } from "@/lib/nutrition";
import type { MealType } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriPlan — App de dieta, emagrecimento e evolução" },
      {
        name: "description",
        content:
          "Monte seu plano alimentar grátis: calorias, macros, fibras, água, jejum e acompanhamento de peso com metas que se ajustam à sua evolução.",
      },
      { property: "og:title", content: "NutriPlan — App de dieta, emagrecimento e evolução" },
      {
        property: "og:description",
        content:
          "Registre refeições por foto ou código de barras e acompanhe seu emagrecimento com gráficos claros.",
      },
      {
        name: "keywords",
        content: "contador de calorias, dieta, emagrecimento, macros, jejum intermitente, plano alimentar",
      },
    ],
    links: [{ rel: "canonical", href: "https://fimdopeso.lovable.app/" }],
  }),
  component: Dashboard,
});

const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner", "extra"];

function Dashboard() {
  const { state } = useStore();
  const { profile, targets } = useProfile();
  const totals = useDayTotals();
  const today = todayKey();

  const water = state.water.find((w) => w.date === today)?.ml ?? 0;
  const startWeight = state.weights.at(-1)?.weight ?? profile.weight;
  const currentWeight = state.weights[0]?.weight ?? profile.weight;
  const totalToLose = Math.abs(startWeight - profile.targetWeight) || 1;
  const done = Math.abs(startWeight - currentWeight);
  const progress = Math.min(100, Math.round((done / totalToLose) * 100));

  const streak = computeStreak(state.logs.map((l) => l.date));
  const activeFast = state.fasts.find((f) => !f.endedAt);

  const logsToday = state.logs.filter((l) => l.date === today);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="gradient-primary flex size-12 items-center justify-center rounded-2xl text-lg font-bold text-primary-foreground">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="truncate text-xl font-bold tracking-tight">{profile.name}</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold">
          <Flame className="size-4 text-warning" />
          {streak}
          <span className="text-xs font-normal text-muted-foreground">dias</span>
        </div>
      </header>

      <section className="card-surface p-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Ring
            value={totals.kcal}
            max={targets.kcal}
            label={`${round(totals.kcal)}`}
            sub={`de ${targets.kcal} kcal`}
          />
          <div className="w-full flex-1 space-y-4">
            <MacroBar label="Proteínas" value={totals.protein} max={targets.protein} />
            <MacroBar label="Carboidratos" value={totals.carbs} max={targets.carbs} color="bg-chart-3" />
            <MacroBar label="Gorduras" value={totals.fat} max={targets.fat} color="bg-chart-4" />
            <p className="text-xs text-muted-foreground">
              Restam {Math.max(0, round(targets.kcal - totals.kcal))} kcal para sua meta de hoje.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link to="/evolucao" className="card-surface p-4 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="size-4 text-primary" /> Peso
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{currentWeight} kg</p>
          <p className="text-xs text-muted-foreground">Meta: {profile.targetWeight} kg · {progress}% concluído</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full gradient-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </Link>

        <Link to="/agua" className="card-surface p-4 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Droplets className="size-4 text-primary" /> Água
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {(water / 1000).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {(targets.water / 1000).toFixed(1)} L</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, (water / targets.water) * 100)}%` }}
            />
          </div>
        </Link>

        <Link to="/jejum" className="card-surface p-4 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="size-4 text-primary" /> Jejum
          </div>
          <p className="mt-2 text-2xl font-bold">{activeFast ? "Em jejum" : "Parado"}</p>
          <p className="text-xs text-muted-foreground">
            {activeFast ? `Meta de ${activeFast.targetHours}h` : "Toque para iniciar"}
          </p>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Refeições de hoje</h2>
          <Button asChild size="sm">
            <Link to="/registrar">
              <Plus className="size-4" /> Adicionar
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {MEALS.map((meal) => {
            const items = logsToday.filter((l) => l.meal === meal);
            const sum = items.reduce(
              (a, i) => ({
                kcal: a.kcal + i.kcal,
                p: a.p + i.protein,
                c: a.c + i.carbs,
                f: a.f + i.fat,
              }),
              { kcal: 0, p: 0, c: 0, f: 0 },
            );
            return (
              <div key={meal} className="card-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{MEAL_LABELS[meal]}</p>
                    <p className="text-xs text-muted-foreground">
                      {round(sum.kcal)} kcal · {round(sum.p)}P · {round(sum.c)}C · {round(sum.f)}G
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="icon">
                    <Link to="/registrar" search={{ meal }}>
                      <Plus className="size-4" />
                    </Link>
                  </Button>
                </div>
                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {items.map((i) => (
                      <li key={i.id} className="flex justify-between text-sm">
                        <span className="truncate text-muted-foreground">
                          {i.name} · {round(i.amount)}
                        </span>
                        <span className="tabular-nums">{round(i.kcal)} kcal</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function computeStreak(dates: string[]) {
  const set = new Set(dates);
  let streak = 0;
  for (const day of [...lastNDays(365)].reverse()) {
    if (set.has(day)) streak++;
    else if (day !== todayKey()) break;
  }
  return streak;
}
