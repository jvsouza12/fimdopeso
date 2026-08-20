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

interface PhotoInput {
  /** imagem em data URL (base64) */
  image: string;
}

/** Estima os alimentos e macros de uma foto de refeição usando IA de visão. */
export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: PhotoInput) => {
    const image = String(input?.image ?? "");
    if (!image.startsWith("data:image/")) throw new Error("Imagem inválida");
    if (image.length > 6_000_000) throw new Error("Imagem muito grande");
    return { image };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { items: [], error: "unavailable" as const };

    const system = [
      "Você identifica alimentos em fotos de refeições e estima porções e macros.",
      "Responda SOMENTE com JSON válido no formato:",
      '{"items":[{"name":"Arroz branco cozido","amount":150,"unit":"g","kcal":195,"protein":3.6,"carbs":42,"fat":0.4,"fiber":0.6}]}',
      "Use gramas quando possível, valores aproximados e nomes em português do Brasil.",
      "Se não houver comida na imagem, retorne {\"items\":[]}.",
    ].join("\n");

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                { type: "text", text: "Quais alimentos estão nesta refeição e quais as quantidades estimadas?" },
                { type: "image_url", image_url: { url: data.image } },
              ],
            },
          ],
        }),
      });

      if (res.status === 429) return { items: [], error: "rate_limit" as const };
      if (res.status === 402) return { items: [], error: "credits" as const };
      if (!res.ok) {
        console.error("AI vision error", res.status, await res.text());
        return { items: [], error: "unavailable" as const };
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return { items: [], error: "unavailable" as const };

      const parsed = JSON.parse(match[0]) as {
        items?: {
          name?: string;
          amount?: number;
          unit?: string;
          kcal?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
        }[];
      };

      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
      const items = (parsed.items ?? [])
        .filter((i) => i && typeof i.name === "string" && i.name.trim())
        .slice(0, 8)
        .map((i) => ({
          name: String(i.name).slice(0, 60),
          amount: n(i.amount) || 100,
          unit: i.unit === "ml" ? "ml" : i.unit === "un" ? "un" : "g",
          kcal: Math.round(n(i.kcal)),
          protein: n(i.protein),
          carbs: n(i.carbs),
          fat: n(i.fat),
          fiber: n(i.fiber),
        }));

      return { items, error: null };
    } catch (err) {
      console.error("AI vision request failed", err);
      return { items: [], error: "unavailable" as const };
    }
  });
