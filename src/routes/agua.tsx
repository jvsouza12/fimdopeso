import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { todayKey, lastNDays, shortDate } from "@/lib/date";
import { Droplets, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export const Route = createFileRoute("/agua")({
  head: () => ({
    meta: [
      { title: "Hidratação — NutriPlan" },
      { name: "description", content: "Controle sua ingestão diária de água com atalhos rápidos e histórico semanal." },
      { property: "og:title", content: "Hidratação — NutriPlan" },
      { property: "og:description", content: "Bata sua meta diária de água todos os dias." },
    ],
  }),
  component: AguaPage,
});

function AguaPage() {
  const { state, update } = useStore();
  const { targets } = useProfile();
  const today = todayKey();
  const ml = state.water.find((w) => w.date === today)?.ml ?? 0;
  const pct = Math.min(100, (ml / targets.water) * 100);

  const add = (amount: number) =>
    update((d) => {
      const existing = d.water.find((w) => w.date === today);
      const next = Math.max(0, (existing?.ml ?? 0) + amount);
      const water = existing
        ? d.water.map((w) => (w.date === today ? { ...w, ml: next } : w))
        : [...d.water, { date: today, ml: next }];
      if (amount > 0 && (existing?.ml ?? 0) < targets.water && next >= targets.water) {
        toast.success("Meta de água concluída! 💧");
      }
      return { ...d, water };
    });

  const chart = lastNDays(7).map((d) => ({
    dia: shortDate(d),
    litros: Number(((state.water.find((w) => w.date === d)?.ml ?? 0) / 1000).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Água" subtitle="Pequenos goles ao longo do dia funcionam melhor." />

      <div className="card-surface flex flex-col items-center p-8">
        <div className="relative flex size-40 items-end justify-center overflow-hidden rounded-full border-4 border-border bg-surface-2">
          <div
            className="absolute inset-x-0 bottom-0 bg-primary/30 transition-all duration-700"
            style={{ height: `${pct}%` }}
          />
          <Droplets className="absolute top-1/2 size-8 -translate-y-1/2 text-primary" />
        </div>
        <p className="mt-6 text-3xl font-bold tabular-nums">
          {(ml / 1000).toFixed(2)} L
          <span className="text-base font-normal text-muted-foreground"> / {(targets.water / 1000).toFixed(1)} L</span>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[250, 500, 750].map((v) => (
            <Button key={v} variant="secondary" onClick={() => add(v)}>
              +{v} ml
            </Button>
          ))}
          <Button variant="ghost" onClick={() => add(-250)}>
            <Undo2 className="size-4" /> Desfazer
          </Button>
        </div>
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-medium">Últimos 7 dias</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="litros" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
