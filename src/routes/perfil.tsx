import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from "@/lib/nutrition";
import type { ActivityLevel, Goal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Download, RefreshCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil e configurações — NutriPlan" },
      { name: "description", content: "Ajuste seus dados, metas de calorias e macros, notificações, tema e exporte seus dados." },
      { property: "og:title", content: "Perfil e configurações — NutriPlan" },
      { property: "og:description", content: "Seus dados, metas e preferências em um só lugar." },
    ],
  }),
  component: PerfilPage,
});

const NOTIFICATIONS: [string, string][] = [
  ["water", "Lembrete de água"],
  ["meals", "Horário das refeições"],
  ["weight", "Registrar peso"],
  ["daily", "Resumo da meta diária"],
  ["fasting", "Início e fim do jejum"],
];

function PerfilPage() {
  const { state, update, reset } = useStore();
  const { profile, targets } = useProfile();
  const [form, setForm] = useState(profile);
  const [t, setT] = useState(targets);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = () => {
    update((d) => ({ ...d, profile: form, targets: t }));
    toast.success("Perfil atualizado");
  };

  const recalc = () => {
    const next = computeTargets(form);
    setT(next);
    update((d) => ({ ...d, profile: form, targets: next }));
    toast.success("Metas recalculadas");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nutriplan-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" subtitle="Seus dados, metas e preferências." />

      <section className="card-surface space-y-4 p-4">
        <p className="font-semibold">Dados pessoais</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label>Idade</Label>
            <Input type="number" value={form.age} onChange={(e) => set("age", +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Altura (cm)</Label>
            <Input type="number" value={form.height} onChange={(e) => set("height", +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Peso atual (kg)</Label>
            <Input type="number" value={form.weight} onChange={(e) => set("weight", +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Peso desejado (kg)</Label>
            <Input type="number" value={form.targetWeight} onChange={(e) => set("targetWeight", +e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Refeições por dia</Label>
            <Input type="number" value={form.mealsPerDay} onChange={(e) => set("mealsPerDay", +e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Objetivo</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <Pill key={g} active={form.goal === g} onClick={() => set("goal", g)}>
                {GOAL_LABELS[g]}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nível de atividade</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <Pill key={a} active={form.activity === a} onClick={() => set("activity", a)}>
                {ACTIVITY_LABELS[a]}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Preferências alimentares</Label>
          <Input value={form.preferences} onChange={(e) => set("preferences", e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label>Alimentos que não gosta</Label>
          <Input value={form.dislikes} onChange={(e) => set("dislikes", e.target.value)} maxLength={200} />
        </div>
      </section>

      <section className="card-surface space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Minhas metas</p>
          <Button variant="ghost" size="sm" onClick={recalc}>
            <RefreshCw className="size-4" /> Recalcular
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["kcal", "Calorias"],
              ["protein", "Proteína (g)"],
              ["carbs", "Carbo (g)"],
              ["fat", "Gordura (g)"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="space-y-2">
              <Label>{l}</Label>
              <Input
                type="number"
                value={t[k]}
                onChange={(e) => setT((p) => ({ ...p, [k]: Math.max(0, +e.target.value), manual: true }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>Água (ml)</Label>
            <Input
              type="number"
              value={t.water}
              onChange={(e) => setT((p) => ({ ...p, water: Math.max(0, +e.target.value), manual: true }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Você pode ajustar manualmente. As estimativas são referências e não substituem avaliação profissional.
        </p>
        <Button className="w-full" onClick={save}>
          Salvar alterações
        </Button>
      </section>

      <section className="card-surface space-y-3 p-4">
        <p className="font-semibold">Notificações</p>
        {NOTIFICATIONS.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm">{l}</span>
            <Switch
              checked={state.settings.notifications[k] ?? false}
              onCheckedChange={(v) =>
                update((d) => ({
                  ...d,
                  settings: { ...d.settings, notifications: { ...d.settings.notifications, [k]: v } },
                }))
              }
            />
          </div>
        ))}
      </section>

      <AccountSection />

      <section className="card-surface space-y-3 p-4">
        <p className="font-semibold">Aparência e dados</p>
        <div className="flex items-center justify-between">
          <span className="text-sm">Tema escuro</span>
          <Switch
            checked={state.settings.theme === "dark"}
            onCheckedChange={(v) =>
              update((d) => ({ ...d, settings: { ...d.settings, theme: v ? "dark" : "light" } }))
            }
          />
        </div>
        <Button variant="secondary" className="w-full" onClick={exportData}>
          <Download className="size-4" /> Exportar meus dados
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={() => {
            if (confirm("Isso apagará todos os seus dados neste dispositivo. Continuar?")) {
              reset();
              toast.success("Dados apagados");
            }
          }}
        >
          <Trash2 className="size-4" /> Apagar todos os dados
        </Button>
        <p className="text-xs text-muted-foreground">
          Seus dados ficam salvos neste dispositivo e funcionam offline.
        </p>
      </section>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
