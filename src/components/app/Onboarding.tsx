import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from "@/lib/nutrition";
import type { ActivityLevel, Goal, Profile, Sex } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, UtensilsCrossed } from "lucide-react";
import { todayKey } from "@/lib/date";

const RESTRICTIONS = [
  "Sem lactose",
  "Sem glúten",
  "Vegetariano",
  "Vegano",
  "Low carb",
  "Diabetes",
  "Nenhuma",
];

const empty: Profile = {
  name: "",
  age: 30,
  sex: "m",
  height: 175,
  weight: 90,
  targetWeight: 80,
  activity: "light",
  goal: "lose",
  mealsPerDay: 4,
  restrictions: [],
  preferences: "",
  dislikes: "",
  fasting: false,
  fastingHours: 16,
  deadlineWeeks: 12,
};

export function Onboarding() {
  const { update } = useStore();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(empty);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const targets = computeTargets(p);
  const steps = 6;

  const finish = () => {
    update((d) => ({
      ...d,
      onboarded: true,
      profile: p,
      targets,
      weights: [{ id: crypto.randomUUID(), date: todayKey(), weight: p.weight, note: "Peso inicial" }],
      goals: [
        {
          id: crypto.randomUUID(),
          title: `Chegar a ${p.targetWeight} kg`,
          target: Math.abs(p.weight - p.targetWeight),
          current: 0,
          unit: "kg",
        },
        { id: crypto.randomUUID(), title: "Beber a meta de água por 7 dias", target: 7, current: 0, unit: "dias" },
      ],
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <span className="gradient-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">CasalPlan</p>
            <p className="text-xs text-muted-foreground">Seu painel pessoal de evolução</p>
          </div>
        </div>

        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: steps }).map((_, i) => (
            <div
              key={i}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        <div className="card-surface animate-in fade-in slide-in-from-bottom-2 p-6 duration-300">
          {step === 0 && (
            <Section title="Como podemos te chamar?" desc="Vamos personalizar sua experiência.">
              <Field label="Nome">
                <Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Idade">
                  <Input type="number" value={p.age} onChange={(e) => set("age", +e.target.value)} />
                </Field>
                <Field label="Sexo">
                  <Choices
                    options={[
                      { v: "m", l: "Masculino" },
                      { v: "f", l: "Feminino" },
                    ]}
                    value={p.sex}
                    onChange={(v) => set("sex", v as Sex)}
                  />
                </Field>
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section title="Seus dados corporais" desc="Usamos para estimar suas necessidades.">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Altura (cm)">
                  <Input type="number" value={p.height} onChange={(e) => set("height", +e.target.value)} />
                </Field>
                <Field label="Peso atual (kg)">
                  <Input type="number" value={p.weight} onChange={(e) => set("weight", +e.target.value)} />
                </Field>
              </div>
              <Field label="Peso desejado (kg)">
                <Input type="number" value={p.targetWeight} onChange={(e) => set("targetWeight", +e.target.value)} />
              </Field>
              <Field label="Prazo (semanas)">
                <Input type="number" value={p.deadlineWeeks} onChange={(e) => set("deadlineWeeks", +e.target.value)} />
              </Field>
            </Section>
          )}

          {step === 2 && (
            <Section title="Nível de atividade" desc="Considere seu dia a dia e treinos.">
              <Choices
                vertical
                options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => ({
                  v: k,
                  l: ACTIVITY_LABELS[k],
                }))}
                value={p.activity}
                onChange={(v) => set("activity", v as ActivityLevel)}
              />
            </Section>
          )}

          {step === 3 && (
            <Section title="Qual seu objetivo?" desc="Podemos ajustar depois quando quiser.">
              <Choices
                vertical
                options={(Object.keys(GOAL_LABELS) as Goal[]).map((k) => ({ v: k, l: GOAL_LABELS[k] }))}
                value={p.goal}
                onChange={(v) => set("goal", v as Goal)}
              />
              <Field label="Refeições por dia">
                <Choices
                  options={[3, 4, 5, 6].map((n) => ({ v: String(n), l: `${n}` }))}
                  value={String(p.mealsPerDay)}
                  onChange={(v) => set("mealsPerDay", +v)}
                />
              </Field>
            </Section>
          )}

          {step === 4 && (
            <Section title="Alimentação" desc="Nos conte suas restrições e preferências.">
              <Field label="Restrições">
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((r) => {
                    const on = p.restrictions.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          set(
                            "restrictions",
                            on ? p.restrictions.filter((x) => x !== r) : [...p.restrictions, r],
                          )
                        }
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Alimentos que você gosta">
                <Input value={p.preferences} onChange={(e) => set("preferences", e.target.value)} placeholder="Frango, arroz, frutas..." />
              </Field>
              <Field label="Alimentos que não gosta">
                <Input value={p.dislikes} onChange={(e) => set("dislikes", e.target.value)} placeholder="Fígado, jiló..." />
              </Field>
              <Field label="Deseja usar jejum intermitente?">
                <Choices
                  options={[
                    { v: "no", l: "Não" },
                    { v: "12", l: "12h" },
                    { v: "14", l: "14h" },
                    { v: "16", l: "16h" },
                    { v: "18", l: "18h" },
                  ]}
                  value={p.fasting ? String(p.fastingHours) : "no"}
                  onChange={(v) => {
                    set("fasting", v !== "no");
                    if (v !== "no") set("fastingHours", +v);
                  }}
                />
              </Field>
            </Section>
          )}

          {step === 5 && (
            <Section title="Seu plano personalizado" desc="Estimativas de referência — você pode ajustar depois.">
              <div className="rounded-2xl bg-surface-2 p-5">
                <p className="text-sm text-muted-foreground">Seu objetivo</p>
                <p className="mt-1 text-lg font-semibold">
                  Sair de {p.weight} kg para {p.targetWeight} kg
                </p>
                <p className="mt-4 text-4xl font-bold tracking-tight text-primary tabular-nums">
                  {targets.kcal.toLocaleString("pt-BR")} <span className="text-lg text-foreground">kcal/dia</span>
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Proteína", `${targets.protein} g`],
                    ["Carboidrato", `${targets.carbs} g`],
                    ["Gordura", `${targets.fat} g`],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-surface p-3">
                      <p className="text-xs text-muted-foreground">{l}</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Água sugerida: {(targets.water / 1000).toFixed(1)} L por dia.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Estes valores são estimativas e não substituem a avaliação de um profissional de saúde.
              </p>
            </Section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            {step < steps - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !p.name.trim()}>
                Continuar <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={finish}>
                <Check className="size-4" /> Começar agora
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
  vertical,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
  vertical?: boolean;
}) {
  return (
    <div className={cn("gap-2", vertical ? "flex flex-col" : "flex flex-wrap")}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
            vertical && "text-left",
            value === o.v
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
