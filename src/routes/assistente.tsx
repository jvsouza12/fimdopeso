import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, useDayTotals } from "@/lib/store";
import { useProfile } from "@/components/app/Gate";
import { round } from "@/lib/nutrition";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { assistantChat } from "@/lib/ai.functions";
import { useSession } from "@/hooks/useSession";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente alimentar — NutriPlan" },
      { name: "description", content: "Sugestões práticas de refeições e ajustes com base nas suas metas do dia." },
      { property: "og:title", content: "Assistente alimentar — NutriPlan" },
      { property: "og:description", content: "Ideias de refeições e encaixes calóricos com base nos seus dados." },
    ],
  }),
  component: AssistentePage,
});

const SUGGESTIONS = [
  "Monte um almoço com até 600 calorias",
  "Quero uma refeição rica em proteína",
  "Tenho arroz, feijão e ovos. Monte uma refeição",
  "Minha dieta está com pouca proteína?",
  "Quero comer pizza hoje. Como encaixo?",
];

function AssistentePage() {
  const { state } = useStore();
  const { profile, targets } = useProfile();
  const totals = useDayTotals();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useSession();
  const chat = useServerFn(assistantChat);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    {
      role: "bot",
      text: `Olá, ${profile.name}! Posso sugerir refeições e ajustes com base nas suas metas. Não sou médico nem nutricionista — minhas sugestões são orientações gerais.`,
    },
  ]);

  const remaining = {
    kcal: Math.max(0, round(targets.kcal - totals.kcal)),
    protein: Math.max(0, round(targets.protein - totals.protein)),
  };

  const buildContext = () =>
    [
      `Nome: ${profile.name}. Objetivo: ${profile.goal}. Peso atual: ${profile.weight} kg. Peso alvo: ${profile.targetWeight} kg. Altura: ${profile.height} cm.`,
      `Metas diárias: ${targets.kcal} kcal, ${targets.protein} g de proteína, ${targets.carbs} g de carboidratos, ${targets.fat} g de gordura.`,
      `Consumido hoje: ${round(totals.kcal)} kcal, ${round(totals.protein)} g de proteína, ${round(totals.carbs)} g de carboidratos, ${round(totals.fat)} g de gordura.`,
      `Restante hoje: ${remaining.kcal} kcal e ${remaining.protein} g de proteína.`,
      profile.restrictions.length ? `Restrições: ${profile.restrictions.join(", ")}.` : "Sem restrições declaradas.",
      profile.dislikes ? `Não gosta de: ${profile.dislikes}.` : "",
      `Receitas salvas: ${state.recipes.length}.`,
    ]
      .filter(Boolean)
      .join(" ");

  const answer = (question: string) => {
    const t = question.toLowerCase();
    if (t.includes("proteí") && t.includes("pouca"))
      return `Hoje você consumiu ${round(totals.protein)} g de proteína de uma meta de ${targets.protein} g. ${
        remaining.protein > 0
          ? `Faltam ${remaining.protein} g — 150 g de frango grelhado (~46 g) ou 1 scoop de whey (~24 g) ajudam a fechar.`
          : "Você já bateu sua meta de proteína. Ótimo trabalho!"
      }`;
    if (t.includes("pizza") || t.includes("encaix"))
      return `Dá para encaixar. Você ainda tem ${remaining.kcal} kcal hoje. Duas fatias de pizza de mussarela somam cerca de 530 kcal. Uma boa estratégia é fazer refeições mais leves e ricas em proteína antes, e caprichar na salada junto.`;
    if (t.includes("arroz") && t.includes("ovo"))
      return "Sugestão: 150 g de arroz + 100 g de feijão + 3 ovos mexidos com pouco azeite e uma salada à vontade. Fica em torno de 620 kcal e 30 g de proteína.";
    if (t.includes("600") || t.includes("almoço"))
      return "Almoço até 600 kcal: 150 g de peito de frango grelhado (~248 kcal), 120 g de arroz (~154 kcal), 100 g de feijão (~76 kcal) e salada com 5 g de azeite (~60 kcal). Total ≈ 540 kcal e 45 g de proteína.";
    if (t.includes("proteí"))
      return "Opções ricas em proteína: peito de frango, tilápia, patinho, ovos, iogurte natural, queijo minas e whey. Cerca de 30 a 40 g de proteína por refeição costuma funcionar bem.";
    if (t.includes("barat"))
      return "Combinação econômica e completa: ovos, arroz, feijão, frango de coxa, banana e aveia. Custo baixo e bom perfil nutricional.";
    if (t.includes("frango"))
      return "Sem frango? Substitua por ovos (3 unidades ≈ 19 g de proteína), tilápia, patinho moído, atum em lata ou uma combinação de feijão com arroz e queijo minas.";
    return `Com base no seu dia: restam ${remaining.kcal} kcal e ${remaining.protein} g de proteína para a meta. Uma refeição equilibrada seria uma fonte de proteína (~150 g), um carboidrato (~120 g de arroz ou batata) e vegetais à vontade. Você tem ${state.recipes.length} receita(s) salva(s) para reaproveitar.`;
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const history = [...messages, { role: "user" as const, text: question }];
    setMessages(history);
    setQ("");

    if (!session) {
      setMessages([...history, { role: "bot", text: answer(question) }]);
      return;
    }

    setLoading(true);
    try {
      const res = await chat({
        data: {
          messages: history
            .slice(1)
            .slice(-8)
            .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.text })),
          context: buildContext(),
        },
      });
      setMessages([
        ...history,
        {
          role: "bot",
          text:
            res.reply ??
            (res.error === "rate_limit"
              ? "Muitas perguntas em pouco tempo. Tente de novo em instantes."
              : answer(question)),
        },
      ]);
    } catch {
      setMessages([...history, { role: "bot", text: answer(question) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Assistente" subtitle="Sugestões práticas com base nas suas metas do dia." />

      <div className="card-surface space-y-3 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                : "mr-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm"
            }
          >
            {m.role === "user" ? m.text : formatReply(m.text)}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => void send(s)}
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send(q);
          }}
          placeholder="Pergunte algo sobre sua alimentação"
          maxLength={300}
        />
        <Button onClick={() => void send(q)} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        </Button>
      </div>

      {!session && (
        <p className="text-xs text-muted-foreground">
          <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
            Entre na sua conta
          </Link>{" "}
          para conversar com o assistente com inteligência artificial e respostas personalizadas.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        O assistente oferece orientações gerais e não substitui acompanhamento profissional.
      </p>
    </div>
  );
}
