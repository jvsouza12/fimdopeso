import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lê o estado do app salvo na nuvem para o usuário autenticado. */
export const getCloudState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_state")
      .select("data, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { state: null as Record<string, unknown> | null, updatedAt: null as string | null };
    return {
      state: data.data as Record<string, unknown> | null,
      updatedAt: data.updated_at as string | null,
    };
  });

/** Salva (upsert) o estado completo do app do usuário autenticado. */
export const saveCloudState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { state: Record<string, unknown> }) => {
    if (!input || typeof input !== "object" || typeof input.state !== "object" || input.state === null) {
      throw new Error("Estado inválido");
    }
    const size = JSON.stringify(input.state).length;
    if (size > 2_000_000) throw new Error("Estado muito grande para sincronizar");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_state")
      .upsert(
        { user_id: context.userId, data: data.state as never, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (error) throw new Error(error.message);
    return { ok: true, savedAt: new Date().toISOString() };
  });
