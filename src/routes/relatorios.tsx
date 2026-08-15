import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { lastNDays, shortDate } from "@/lib/date";
import { round } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — NutriPlan" },
      { name: "description", content: "Estatísticas de calorias, proteína, água, peso e jejum em 7, 30, 90 dias ou 1 ano." },
      { property: "og:title", content: "Relatórios — NutriPlan" },
      { property: "og:description", content: "Veja médias e tendências da sua alimentação e evolução." },
    ],
  }),
  component: RelatoriosPage,
});

const RANGES = [
  { d: 7, l: "7 dias" },
  { d: 30, l: "30 dias" },
  { d: 90, l: "90 dias" },
  { d: 365, l: "1 ano" },
];

function RelatoriosPage() {
  const { state } = useStore();
  const { targets } = useProfile();
  const [range, setRange] = useState(7);

  const days = lastNDays(range);
  const series = days.map((d) => {
    const logs = state.logs.filter((l) => l.date === d);
    return {
      dia: shortDate(d),
      kcal: round(logs.reduce((a, l) => a + l.kcal, 0)),
      proteina: round(logs.reduce((a, l) => a + l.protein, 0)),
      agua: Number(((state.water.find((w) => w.date === d)?.ml ?? 0) / 1000).toFixed(2)),
      peso: state.weights.find((w) => w.date === d)?.weight ?? null,
    };
  });

  const activeDays = series.filter((s) => s.kcal > 0);
  const avg = (k: "kcal" | "proteina" | "agua") =>
    activeDays.length ? round(activeDays.reduce((a, s) => a + (s[k] as number), 0) / activeDays.length, 1) : 0;

  const fastsInRange = state.fasts.filter((f) => f.endedAt).length;

  const cards = [
    ["Média de calorias", `${avg("kcal")} kcal`, `Meta: ${targets.kcal}`],
    ["Proteína média", `${avg("proteina")} g`, `Meta: ${targets.protein} g`],
    ["Água média", `${avg("agua")} L`, `Meta: ${(targets.water / 1000).toFixed(1)} L`],
    ["Dias registrados", `${activeDays.length}`, `de ${range} dias`],
    ["Refeições registradas", `${state.logs.filter((l) => days.includes(l.date)).length}`, "no período"],
    ["Jejuns concluídos", `${fastsInRange}`, "no total"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Sua evolução em números simples." />

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.d}
            onClick={() => setRange(r.d)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              range === r.d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
            )}
          >
            {r.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([l, v, s]) => (
          <div key={l} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
            <p className="text-[11px] text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-medium">Calorias por dia</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12 }}
              />
              <Bar dataKey="kcal" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-medium">Proteína por dia</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12 }}
              />
              <Area type="monotone" dataKey="proteina" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
