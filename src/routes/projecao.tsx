import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { shortDate, todayKey } from "@/lib/date";
import { round } from "@/lib/nutrition";
import { buildProjection, dateForWeight, projectionSeries, weightAt } from "@/lib/projection";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

export const Route = createFileRoute("/projecao")({
  head: () => ({
    meta: [
      { title: "Projeção de peso — NutriPlan" },
      { name: "description", content: "Veja quanto você deve pesar numa data futura mantendo o ritmo atual de perda ou ganho de peso." },
      { property: "og:title", content: "Projeção de peso — NutriPlan" },
      { property: "og:description", content: "Estimativa do seu peso futuro com base nos registros e no ritmo atual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjecaoPage,
});

function plusDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function ProjecaoPage() {
  const { state } = useStore();
  const { profile } = useProfile();
  const [target, setTarget] = useState(() => plusDays(90));

  const projection = useMemo(() => buildProjection(state.weights), [state.weights]);
  const series = useMemo(
    () => (projection ? projectionSeries(state.weights, projection, target) : []),
    [state.weights, projection, target],
  );

  if (!projection) {
    return (
      <div className="space-y-6">
        <PageHeader title="Projeção" subtitle="Estimativa do seu peso futuro mantendo o ritmo atual." />
        <EmptyState
          icon={<LineChartIcon className="h-6 w-6" />}
          title="Ainda não dá para projetar"
          description="Registre seu peso em pelo menos dois dias diferentes para o app calcular seu ritmo e estimar o peso futuro."
          actionLabel="Registrar peso"
          to="/evolucao"
        />
      </div>
    );
  }

  const daysAhead = Math.max(0, Math.round((new Date(`${target}T00:00:00`).getTime() - Date.now()) / 86_400_000));
  const projected = weightAt(projection, target);
  const diff = round(projected - projection.currentTrend, 1);
  const goalDate = dateForWeight(projection, profile.targetWeight);
  const rate = round(projection.ratePerWeek, 2);
  const direction = rate < -0.02 ? "perdendo" : rate > 0.02 ? "ganhando" : "mantendo";
  const confidence = projection.r2 > 0.6 && projection.points >= 5 ? "alta" : projection.points >= 4 ? "média" : "baixa";

  const chart = series.map((s) => ({ ...s, dia: shortDate(s.date) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Projeção" subtitle="Se você mantiver o ritmo atual, é assim que seu peso deve evoluir." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Ritmo atual", `${rate > 0 ? "+" : ""}${rate} kg/sem`, `Você está ${direction} peso`],
          ["Peso de hoje (tendência)", `${round(projection.currentTrend, 1)} kg`, `Último registro: ${projection.lastWeight} kg`],
          ["Estimativa na data", `${projected} kg`, `${diff > 0 ? "+" : ""}${diff} kg em ${daysAhead} dias`],
          [
            "Meta de " + profile.targetWeight + " kg",
            goalDate ? shortDate(goalDate) : "Sem previsão",
            goalDate ? "Data estimada" : "O ritmo atual não leva à meta",
          ],
        ].map(([l, v, s]) => (
          <div key={l} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <div className="card-surface space-y-4 p-4">
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="data-alvo">Projetar até a data</Label>
          <Input
            id="data-alvo"
            type="date"
            min={todayKey()}
            value={target}
            onChange={(e) => setTarget(e.target.value || plusDays(90))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[30, 60, 90, 180, 365].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setTarget(plusDays(d))}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              {d} dias
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Em <strong className="text-foreground">{shortDate(target)}</strong> você deve estar com cerca de{" "}
          <strong className="text-foreground">{projected} kg</strong>, mantendo o ritmo de {rate} kg por semana.
          Confiança da estimativa: {confidence} ({projection.points} registros em {Math.round(projection.spanDays)} dias).
        </p>
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-medium">Histórico e projeção</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                formatter={(v, n) => [v === null || v === undefined ? "—" : `${v} kg`, n === "real" ? "Registrado" : "Projeção"]}
              />
              <Line type="monotone" dataKey="real" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line
                type="monotone"
                dataKey="projecao"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-surface p-4">
        <p className="mb-3 text-sm font-medium">Marcos estimados</p>
        <ul className="space-y-2 text-sm">
          {[30, 60, 90, 180].map((d) => {
            const date = plusDays(d);
            return (
              <li key={d} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">Em {d} dias ({shortDate(date)})</span>
                <span className="font-semibold tabular-nums">{weightAt(projection, date)} kg</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
