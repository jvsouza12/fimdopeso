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
import type { ActivityLevel, Goal, Targets } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BellRing, Download, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { AccountSection } from "@/components/app/AccountSection";
import { adaptiveSuggestion } from "@/lib/adaptive";
import { DEFAULT_REMINDERS, notificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { WEEKDAYS } from "@/lib/date";
import { WalkingHistory } from "@/components/app/WalkingHistory";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Perfil e configurações — CasalPlan" },
      { name: "description", content: "Ajuste seus dados, metas de calorias e macros, notificações, tema e exporte seus dados." },
      { property: "og:title", content: "Perfil e configurações — CasalPlan" },
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
  const { session } = useSession();
  const { profile, targets } = useProfile();
  const [form, setForm] = useState(profile);
  const [t, setT] = useState(targets);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Informe seu nome para salvar o perfil");
      return;
    }
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
    a.download = "casalplan-dados.json";
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
          <div className="space-y-2 sm:col-span-2">
            <Label>Sexo (usado no cálculo das metas)</Label>
            <div className="flex flex-wrap gap-2">
              {([["f", "Feminino"], ["m", "Masculino"]] as const).map(([value, label]) => (
                <Pill key={value} active={form.sex === value} onClick={() => set("sex", value)}>
                  {label}
                </Pill>
              ))}
            </div>
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
          {(
            [
              ["fiber", "Fibras (g)"],
              ["sugar", "Açúcar (g)"],
              ["sodium", "Sódio (mg)"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="space-y-2">
              <Label>{l}</Label>
              <Input
                type="number"
                value={t[k] ?? 0}
                onChange={(e) => setT((p) => ({ ...p, [k]: Math.max(0, +e.target.value), manual: true }))}
              />
            </div>
          ))}
        </div>

        <AdaptiveCard
          onApply={(next) => {
            setT(next);
            update((d) => ({ ...d, targets: next }));
            toast.success("Metas ajustadas conforme sua evolução");
          }}
        />
        <p className="text-xs text-muted-foreground">
          Você pode ajustar manualmente. As estimativas são referências e não substituem avaliação profissional.
        </p>
        <Button className="w-full" onClick={save}>
          Salvar alterações
        </Button>
      </section>

      <RemindersSection />

      <AccountSection />
      {session && <WalkingHistory compact />}

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
          Seus dados funcionam offline neste aparelho e, com a conta conectada, são sincronizados na nuvem.
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

/** Sugere ajustar as calorias quando a evolução real difere do ritmo esperado. */
function AdaptiveCard({ onApply }: { onApply: (next: Targets) => void }) {
  const { state, update } = useStore();
  const suggestion = adaptiveSuggestion(state);
  const enabled = state.settings.autoAdjust ?? true;

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Ajuste automático
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compara sua evolução real com o ritmo planejado a cada nova pesagem.
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label="Ativar ajuste automático de metas"
          onCheckedChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, autoAdjust: v } }))}
        />
      </div>

      {enabled ? (
        suggestion ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm">{suggestion.message}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Real", `${suggestion.actualRate > 0 ? "+" : ""}${suggestion.actualRate.toFixed(2)} kg/sem`],
                ["Esperado", `${suggestion.expectedRate > 0 ? "+" : ""}${suggestion.expectedRate.toFixed(2)} kg/sem`],
                ["Sugestão", `${suggestion.deltaKcal > 0 ? "+" : ""}${suggestion.deltaKcal} kcal`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-surface p-2">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="text-sm font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            {suggestion.deltaKcal !== 0 ? (
              <Button size="sm" className="w-full" onClick={() => onApply(suggestion.suggested)}>
                Aplicar {suggestion.suggested.kcal} kcal por dia
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Registre seu peso por pelo menos 10 dias para receber uma sugestão de ajuste.
          </p>
        )
      ) : null}
    </div>
  );
}

/** Configura os lembretes e pede permissão para enviar avisos. */
function RemindersSection() {
  const { state, update } = useStore();
  const reminders = { ...DEFAULT_REMINDERS, ...(state.settings.reminders ?? {}) };
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window === "undefined" ? "default" : notificationPermission(),
  );

  const setReminders = (patch: Partial<typeof reminders>) =>
    update((d) => ({ ...d, settings: { ...d.settings, reminders: { ...reminders, ...patch } } }));

  return (
    <section className="card-surface space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Lembretes</p>
        {permission === "granted" ? (
          <span className="flex items-center gap-1 text-xs text-success">
            <BellRing className="size-3.5" /> Ativados
          </span>
        ) : permission === "unsupported" ? (
          <span className="text-xs text-muted-foreground">Indisponível neste navegador</span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const p = await requestNotificationPermission();
              setPermission(p);
              if (p === "granted") toast.success("Avisos ativados");
              else if (p === "denied") toast.error("Você bloqueou os avisos nas configurações do navegador.");
            }}
          >
            <BellRing className="size-4" /> Ativar avisos
          </Button>
        )}
      </div>

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

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Beber água a cada (minutos)</Label>
          <Input
            type="number"
            min={30}
            max={480}
            step={15}
            value={reminders.waterEveryMin}
            onChange={(e) => setReminders({ waterEveryMin: Math.min(480, Math.max(30, +e.target.value)) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Resumo do dia às</Label>
          <Input type="time" value={reminders.dailyTime} onChange={(e) => setReminders({ dailyTime: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Dia de se pesar</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <Pill key={d} active={reminders.weightWeekday === i} onClick={() => setReminders({ weightWeekday: i })}>
                {d}
              </Pill>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Horários das refeições</Label>
          <div className="flex flex-wrap gap-2">
            {reminders.mealTimes.map((time, i) => (
              <Input
                key={i}
                type="time"
                aria-label={`Horário da refeição ${i + 1}`}
                className="w-32"
                value={time}
                onChange={(e) => {
                  const next = [...reminders.mealTimes];
                  next[i] = e.target.value;
                  setReminders({ mealTimes: next });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Os avisos chegam enquanto o app estiver aberto em uma aba do navegador.
      </p>
    </section>
  );
}
