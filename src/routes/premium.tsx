import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PREMIUM_FEATURES,
  PREMIUM_PRICE_MONTHLY,
  PREMIUM_PRICE_YEARLY,
  TRIAL_DAYS,
  usePremium,
} from "@/lib/premium";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "CasalPlan Premium — recursos avançados" },
      {
        name: "description",
        content:
          "Assine o CasalPlan Premium: assistente com IA, registro por foto e código de barras, projeção de peso e relatórios completos.",
      },
      { property: "og:title", content: "CasalPlan Premium" },
      { property: "og:description", content: "Assistente com IA, registro por foto e relatórios avançados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PremiumPage,
});

const FREE_ITEMS = [
  "Registro manual de refeições",
  "Metas de calorias e macros",
  "Água, jejum e evolução de peso",
  "Receitas e lista de compras",
];

function PremiumPage() {
  const { premium, trial, trialUsed, daysLeft, subscription, startTrial, cancel } = usePremium();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [notice, setNotice] = useState<string | null>(null);

  const price = cycle === "monthly" ? PREMIUM_PRICE_MONTHLY : PREMIUM_PRICE_YEARLY;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Premium"
        subtitle="Desbloqueie os recursos avançados do CasalPlan."
      />

      {premium && (
        <section className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="gradient-primary flex size-10 items-center justify-center rounded-xl text-primary-foreground">
              <Crown className="size-5" />
            </span>
            <div>
              <p className="font-semibold">
                {trial ? "Teste grátis ativo" : "Assinatura ativa"}
              </p>
              <p className="text-sm text-muted-foreground">
                {trial && daysLeft !== null
                  ? `Restam ${daysLeft} dia${daysLeft === 1 ? "" : "s"} de teste.`
                  : `Plano ${subscription.cycle === "yearly" ? "anual" : "mensal"} — tudo liberado.`}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={cancel}>
            Voltar para o gratuito
          </Button>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold">Gratuito</h2>
            <p className="text-sm text-muted-foreground">O essencial para acompanhar sua dieta.</p>
          </div>
          <p className="text-3xl font-bold">R$ 0</p>
          <ul className="space-y-2 text-sm">
            {FREE_ITEMS.map((i) => (
              <li key={i} className="flex gap-2 text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {i}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-surface space-y-4 border-primary/40 p-5 ring-1 ring-primary/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                Premium <Sparkles className="size-4 text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground">Tudo do gratuito, mais os recursos avançados.</p>
            </div>
          </div>

          <div className="inline-flex rounded-xl bg-muted p-1 text-sm">
            <button
              onClick={() => setCycle("monthly")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-colors",
                cycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-colors",
                cycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Anual · 2 meses grátis
            </button>
          </div>

          <p className="text-3xl font-bold">
            R$ {price}
            <span className="text-base font-medium text-muted-foreground">
              {cycle === "monthly" ? "/mês" : "/ano"}
            </span>
          </p>

          <ul className="space-y-3 text-sm">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.id} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="font-medium">{f.title}</span>
                  <span className="block text-muted-foreground">{f.description}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 pt-1">
            {!premium && !trialUsed && (
              <Button size="lg" className="w-full" onClick={startTrial}>
                Testar grátis por {TRIAL_DAYS} dias
              </Button>
            )}
            <Button
              size="lg"
              variant={!premium && !trialUsed ? "outline" : "default"}
              className="w-full"
              onClick={() => setNotice("O pagamento ainda está sendo configurado. Em breve você poderá assinar por aqui.")}
            >
              Assinar {cycle === "monthly" ? "mensal" : "anual"}
            </Button>
            {notice && <p className="text-center text-sm text-muted-foreground">{notice}</p>}
            <p className="text-center text-xs text-muted-foreground">
              Cancele quando quiser. Sem fidelidade.
            </p>
          </div>
        </section>
      </div>

      <section className="card-surface space-y-2 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Perguntas rápidas</p>
        <p>O teste grátis libera todos os recursos por {TRIAL_DAYS} dias, uma vez por conta.</p>
        <p>Seus dados continuam salvos mesmo se você voltar para o plano gratuito.</p>
      </section>
    </div>
  );
}
