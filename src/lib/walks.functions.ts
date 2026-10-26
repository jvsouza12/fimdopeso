import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface WalkPointPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  segment: number;
  altitude?: number | null;
}

export interface WalkRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  distance_meters: number;
  points: WalkPointPayload[] | null;
}

export interface WalkPayload {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  points: WalkPointPayload[];
}

interface LooseResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

/** Consulta mínima da tabela de caminhadas, sem depender do esquema gerado. */
type LooseQuery = {
  select: (columns?: string) => LooseQuery;
  eq: (column: string, value: string) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  insert: (values: Record<string, unknown>) => LooseQuery;
  delete: () => LooseQuery;
} & PromiseLike<LooseResult>;

interface LooseClient {
  from: (table: string) => LooseQuery;
}

function walks(context: { supabase: unknown }): LooseQuery {
  return (context.supabase as unknown as LooseClient).from("walks");
}

function validateWalk(input: WalkPayload): WalkPayload {
  if (!input || typeof input !== "object") throw new Error("Caminhada inválida");
  if (typeof input.id !== "string" || input.id.length < 8 || input.id.length > 64) {
    throw new Error("Identificador da caminhada inválido");
  }
  if (typeof input.startedAt !== "string" || Number.isNaN(Date.parse(input.startedAt))) {
    throw new Error("Início da caminhada inválido");
  }
  if (typeof input.endedAt !== "string" || Number.isNaN(Date.parse(input.endedAt))) {
    throw new Error("Fim da caminhada inválido");
  }
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 0) {
    throw new Error("Tempo da caminhada inválido");
  }
  if (!Number.isFinite(input.distanceMeters) || input.distanceMeters < 0) {
    throw new Error("Distância da caminhada inválida");
  }
  if (!Array.isArray(input.points)) throw new Error("Percurso da caminhada inválido");
  if (JSON.stringify(input.points).length > 1_500_000) {
    throw new Error("Percurso grande demais para enviar de uma vez");
  }
  return input;
}

/** Caminhadas concluídas que já estão na conta do usuário logado. */
export const listWalks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await walks(context)
      .select("id, started_at, ended_at, duration_seconds, distance_meters, points")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { walks: (data ?? []) as WalkRow[] };
  });

/** Envia (ou reenvia) uma caminhada concluída para a conta do usuário logado. */
export const uploadWalk = createServerFn({ method: "POST" })
  .inputValidator((input: WalkPayload) => validateWalk(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await walks(context).insert({
      id: data.id,
      user_id: context.userId,
      started_at: data.startedAt,
      ended_at: data.endedAt,
      duration_seconds: Math.round(data.durationSeconds),
      distance_meters: data.distanceMeters,
      points: data.points,
    });

    // Reenvio da mesma caminhada não é falha: ela já está na conta.
    if (error && error.code !== "23505") throw new Error(error.message);
    return { ok: true };
  });

/** Remove da conta a caminhada que a pessoa apagou no aparelho. */
export const removeWalk = createServerFn({ method: "POST" })
  .inputValidator((input: { walkId: string }) => {
    if (!input || typeof input.walkId !== "string" || input.walkId.length < 8) {
      throw new Error("Caminhada inválida");
    }
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await walks(context)
      .delete()
      .eq("id", data.walkId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
