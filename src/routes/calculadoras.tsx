import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/components/app/Gate";
import { bmi, bmiLabel, bmr, computeTargets, idealWeightRange, tdee, ACTIVITY_LABELS } from "@/lib/nutrition";
import type { ActivityLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calculadoras")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Calculadoras — NutriPlan" },
      { name: "description", content: "Calcule IMC, TMB, gasto calórico diário, meta calórica e macronutrientes com explicações simples." },
      { property: "og:title", content: "Calculadoras — NutriPlan" },
      { property: "og:description", content: "IMC, TMB, gasto energético e macros explicados de forma simples." },
    ],
  }),
  component: CalculadorasPage,
});

function CalculadorasPage() {
  const { profile } = useProfile();
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [age, setAge] = useState(profile.age);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);

  const p = { ...profile, weight, height, age, activity };
  const imc = bmi(weight, height);
  const [minW, maxW] = idealWeightRange(height);
  const targets = computeTargets(p);

  return (
    <div className="space-y-6">
      <PageHeader title="Calculadoras" subtitle="Estimativas de referência — não são diagnóstico." />

      <div className="card-surface grid gap-3 p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Peso (kg)</Label>
          <Input type="number" value={weight} onChange={(e) => setWeight(+e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Altura (cm)</Label>
          <Input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Idade</Label>
          <Input type="number" value={age} onChange={(e) => setAge(+e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-3">
          <Label>Nível de atividade</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
              <button
                key={k}
                onClick={() => setActivity(k)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs",
                  activity === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
                )}
              >
                {ACTIVITY_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          title="IMC"
          value={imc.toFixed(1)}
          note={`${bmiLabel(imc)}. O IMC é apenas uma referência populacional e não considera massa muscular.`}
        />
        <Card
          title="TMB (metabolismo basal)"
          value={`${bmr(p)} kcal`}
          note="Energia que seu corpo gasta em repouso, apenas para funcionar."
        />
        <Card
          title="Gasto calórico diário"
          value={`${tdee(p)} kcal`}
          note="TMB multiplicado pelo seu nível de atividade — é o que você gasta em um dia comum."
        />
        <Card
          title="Meta calórica sugerida"
          value={`${targets.kcal} kcal`}
          note="Ajustada ao seu objetivo. Você pode alterar manualmente no perfil."
        />
        <Card
          title="Macronutrientes sugeridos"
          value={`${targets.protein}P / ${targets.carbs}C / ${targets.fat}G`}
          note="Proteína prioriza a preservação de massa magra durante o emagrecimento."
        />
        <Card
          title="Faixa de peso de referência"
          value={`${minW} – ${maxW} kg`}
          note="Baseada no IMC. Não é uma meta obrigatória nem um diagnóstico."
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Estas estimativas não substituem a avaliação de um profissional de saúde ou nutrição.
      </p>
    </div>
  );
}

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
