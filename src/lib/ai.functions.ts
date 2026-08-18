import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface ChatInput {
  messages: { role: "user" | "assistant"; content: string }[];
  context: string;
}

/** Assistente nutricional com IA (Lovable AI Gateway), disponível para usuários autenticados. */
export const assistantChat = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || !Array.isArray(input.messages) || input.messages.length === 0) {
      throw new Error("Mensagem inválida");
    }
    const messages = input.messages.slice(-10).map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      const content = String(m.content ?? "").slice(0, 800);
      if (!content.trim()) throw new Error("Mensagem vazia");
      return { role, content } as const;
    });
    return { messages, context: String(input.context ?? "").slice(0, 2000) };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { reply: null, error: "unavailable" as const };

    const system = [
      "Você é o assistente do NutriPlan, um app de alimentação saudável e emagrecimento.",
      "Responda em português do Brasil, de forma direta, prática e acolhedora, em no máximo 120 palavras.",
      "Use os dados do usuário para sugerir refeições, porções e ajustes, sempre com números aproximados de calorias e proteína.",
      "Nunca faça diagnósticos nem prescreva tratamentos; lembre que não substitui nutricionista ou médico quando o assunto for saúde.",
      "Dados atuais do usuário:",
      data.context,
    ].join("\n");

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });

      if (res.status === 429) return { reply: null, error: "rate_limit" as const };
      if (res.status === 402) return { reply: null, error: "credits" as const };
      if (!res.ok) {
        console.error("AI gateway error", res.status, await res.text());
        return { reply: null, error: "unavailable" as const };
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = json.choices?.[0]?.message?.content?.trim();
      if (!reply) return { reply: null, error: "unavailable" as const };
      return { reply, error: null };
    } catch (err) {
      console.error("AI gateway request failed", err);
      return { reply: null, error: "unavailable" as const };
    }
  });
