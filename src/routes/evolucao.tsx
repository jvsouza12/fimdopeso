import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { todayKey, shortDate } from "@/lib/date";
import { round } from "@/lib/nutrition";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/evolucao")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Evolução e medidas — NutriPlan" },
      { name: "description", content: "Registre peso e medidas corporais e acompanhe sua evolução em gráficos claros." },
      { property: "og:title", content: "Evolução e medidas — NutriPlan" },
      { property: "og:description", content: "Peso, médias semanais e medidas corporais em um só lugar." },
    ],
  }),
  component: EvolucaoPage,
});

function EvolucaoPage() {
  const { state, update } = useStore();
  const { profile } = useProfile();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");

  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.weight ?? profile.weight;
  const current = sorted.at(-1)?.weight ?? profile.weight;
  const lost = round(start - current, 1);
  const remaining = round(current - profile.targetWeight, 1);
  const total = Math.abs(start - profile.targetWeight) || 1;
  const pct = Math.max(0, Math.min(100, Math.round((Math.abs(start - current) / total) * 100)));

  const chart = sorted.map((w) => ({ date: shortDate(w.date), peso: w.weight }));
  const weekly = weeklyAverages(sorted.map((w) => ({ date: w.date, value: w.weight })));

  return (
    <div className="space-y-6">
      <PageHeader title="Evolução" subtitle="Acompanhe seu peso e suas medidas ao longo do tempo." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Peso atual", `${current} kg`],
          ["Peso inicial", `${start} kg`],
          ["Peso perdido", `${lost} kg`],
          ["Falta", `${remaining} kg`],
        ].map(([l, v]) => (
          <div key={l} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso da meta</span>
          <span className="tabular-nums text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Tabs defaultValue="peso">
        <TabsList className="w-full">
          <TabsTrigger value="peso" className="flex-1">Peso</TabsTrigger>
          <TabsTrigger value="medidas" className="flex-1">Medidas</TabsTrigger>
        </TabsList>

        <TabsContent value="peso" className="mt-4 space-y-4">
          <div className="card-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label>Novo peso (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-32"
                  placeholder="0,0"
                />
              </div>
              <div className="min-w-40 flex-1 space-y-2">
                <Label>Observação</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Opcional" />
              </div>
              <Button
                onClick={() => {
                  const v = Number(weight.replace(",", "."));
                  if (!v || v < 20 || v > 400) {
                    toast.error("Informe um peso válido");
                    return;
                  }
                  update((d) => ({
                    ...d,
                    weights: [
                      { id: crypto.randomUUID(), date: todayKey(), weight: v, note: note || undefined },
                      ...d.weights,
                    ],
                    profile: d.profile ? { ...d.profile, weight: v } : d.profile,
                  }));
                  const diff = round(current - v, 1);
                  toast.success(diff > 0 ? `Ótimo! ${diff} kg a menos desde o último registro` : "Peso registrado");
                  setWeight("");
                  setNote("");
                }}
              >
                Registrar
              </Button>
            </div>
          </div>

          {chart.length > 1 && (
            <div className="card-surface p-4">
              <p className="mb-3 text-sm font-medium">Evolução do peso</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="peso" stroke="var(--color-primary)" fill="url(#wg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {weekly.length > 0 && (
            <div className="card-surface p-4">
              <p className="text-sm font-medium">Médias semanais</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Use a média da semana como referência — o peso diário oscila naturalmente.
              </p>
              <ul className="space-y-1 text-sm">
                {weekly.map((w) => (
                  <li key={w.label} className="flex justify-between">
                    <span className="text-muted-foreground">{w.label}</span>
                    <span className="tabular-nums">{round(w.avg, 1)} kg</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {[...state.weights].map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-20 text-muted-foreground">{shortDate(w.date)}</span>
                <span className="font-medium tabular-nums">{w.weight} kg</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{w.note}</span>
                <button onClick={() => update((d) => ({ ...d, weights: d.weights.filter((x) => x.id !== w.id) }))}>
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="medidas" className="mt-4">
          <Measures />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const FIELDS = [
  ["waist", "Cintura"],
  ["abdomen", "Abdômen"],
  ["hip", "Quadril"],
  ["arm", "Braço"],
  ["chest", "Peito"],
  ["thigh", "Coxa"],
] as const;

function Measures() {
  const { state, update } = useStore();
  const [form, setForm] = useState<Record<string, string>>({});

  const data = [...state.measures]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ ...m, date: shortDate(m.date) }));

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map(([k, l]) => (
            <div key={k} className="space-y-2">
              <Label>{l} (cm)</Label>
              <Input
                type="number"
                value={form[k] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            const entry: Record<string, unknown> = { id: crypto.randomUUID(), date: todayKey() };
            let any = false;
            FIELDS.forEach(([k]) => {
              const v = Number(form[k]);
              if (v > 0) {
                entry[k] = v;
                any = true;
              }
            });
            if (!any) {
              toast.error("Preencha ao menos uma medida");
              return;
            }
            update((d) => ({ ...d, measures: [entry as never, ...d.measures] }));
            setForm({});
            toast.success("Medidas registradas");
          }}
        >
          Salvar medidas
        </Button>
      </div>

      {data.length > 1 && (
        <div className="card-surface p-4">
          <p className="mb-3 text-sm font-medium">Evolução das medidas</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Line type="monotone" dataKey="waist" name="Cintura" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="abdomen" name="Abdômen" stroke="var(--color-chart-2)" strokeWidth={2} />
                <Line type="monotone" dataKey="hip" name="Quadril" stroke="var(--color-chart-3)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function weeklyAverages(items: { date: string; value: number }[]) {
  const groups = new Map<string, number[]>();
  items.forEach((i) => {
    const d = new Date(i.date);
    const week = new Date(d);
    week.setDate(d.getDate() - d.getDay());
    const key = `Semana de ${String(week.getDate()).padStart(2, "0")}/${String(week.getMonth() + 1).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), i.value]);
  });
  return [...groups.entries()]
    .map(([label, vals]) => ({ label, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .slice(-8);
}
