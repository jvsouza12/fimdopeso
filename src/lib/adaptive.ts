import type { AppState, Targets } from "./types";
import { computeTargets } from "./nutrition";

const KCAL_PER_KG = 7700;

export interface AdaptiveSuggestion {
  /** variação real de peso por semana (kg, negativo = perdendo) */
  actualRate: number;
  /** variação esperada por semana segundo o objetivo */
  expectedRate: number;
  /** diferença sugerida de calorias por dia */
  deltaKcal: number;
  suggested: Targets;
  weeks: number;
  message: string;
}

/** Média dos pesos registrados num intervalo de dias (para reduzir ruído diário). */
function averageAround(
  weights: { date: string; weight: number }[],
  fromIndex: number,
  windowSize = 3,
): number | null {
  const slice = weights.slice(fromIndex, fromIndex + windowSize);
  if (slice.length === 0) return null;
  return slice.reduce((a, w) => a + w.weight, 0) / slice.length;
}

const daysBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

/**
 * Compara a evolução real do peso com o ritmo esperado e sugere um ajuste
 * de calorias. Retorna null quando ainda não há dados suficientes.
 */
export function adaptiveSuggestion(state: AppState): AdaptiveSuggestion | null {
  const { profile, targets } = state;
  if (!profile || !targets) return null;

  // pesos ordenados do mais recente para o mais antigo
  const weights = [...state.weights].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (weights.length < 4) return null;

  const recent = averageAround(weights, 0);
  const oldestIndex = weights.length - 1;
  const older = averageAround(weights, Math.max(0, oldestIndex - 2));
  if (recent === null || older === null) return null;

  const days = daysBetween(weights[0]!.date, weights[oldestIndex]!.date);
  if (days < 10) return null;

  const weeks = days / 7;
  const actualRate = (recent - older) / weeks;

  const expectedRate =
    profile.goal === "lose"
      ? -Math.min(1, Math.max(0.25, Math.abs(profile.weight - profile.targetWeight) / Math.max(4, profile.deadlineWeeks)))
      : profile.goal === "gain"
        ? 0.25
        : 0;

  const diff = expectedRate - actualRate; // negativo = precisa comer menos
  let deltaKcal = Math.round((diff * KCAL_PER_KG) / 7 / 25) * 25;
  deltaKcal = Math.max(-400, Math.min(400, deltaKcal));

  const base = computeTargets(profile);
  const kcal = Math.max(profile.sex === "m" ? 1500 : 1200, targets.kcal + deltaKcal);
  const factor = kcal / Math.max(1, targets.kcal);

  const suggested: Targets = {
    ...targets,
    kcal,
    carbs: Math.max(0, Math.round(targets.carbs * factor)),
    fat: Math.max(0, Math.round(targets.fat * factor)),
    protein: targets.protein,
    fiber: base.fiber,
    manual: false,
  };

  const message =
    Math.abs(deltaKcal) < 50
      ? "Seu ritmo está dentro do esperado. Nenhum ajuste necessário por enquanto."
      : deltaKcal < 0
        ? `Você está perdendo ${Math.abs(actualRate).toFixed(2)} kg/semana, abaixo do ritmo planejado. Sugerimos reduzir ${Math.abs(deltaKcal)} kcal por dia.`
        : `Sua perda está mais rápida que o planejado (${Math.abs(actualRate).toFixed(2)} kg/semana). Sugerimos aumentar ${deltaKcal} kcal por dia para preservar massa magra.`;

  return { actualRate, expectedRate, deltaKcal, suggested, weeks, message };
}
