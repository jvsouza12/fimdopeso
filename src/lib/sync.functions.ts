import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lê o estado do app salvo na nuvem para o usuário autenticado (JSON serializado). */
export const getCloudState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_state")
      .select("data, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { state: null as string | null, updatedAt: null as string | null };
    return { state: JSON.stringify(data.data), updatedAt: data.updated_at as string | null };
  });

/** Salva (upsert) o estado completo do app do usuário autenticado. */
export const saveCloudState = createServerFn({ method: "POST" })
  .inputValidator((input: { state: string }) => {
    if (!input || typeof input.state !== "string") throw new Error("Estado inválido");
    if (input.state.length > 2_000_000) throw new Error("Estado muito grande para sincronizar");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.state);
    } catch {
      throw new Error("Estado inválido");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Estado inválido");

    const { error } = await context.supabase
      .from("user_state")
      .upsert(
        { user_id: context.userId, data: parsed as never, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (error) throw new Error(error.message);
    return { ok: true, savedAt: new Date().toISOString() };
  });
