import type { WeightEntry } from "./types";
import { round } from "./nutrition";

export interface Projection {
  /** kg por dia (negativo = perdendo) */
  slopePerDay: number;
  /** kg por semana */
  ratePerWeek: number;
  /** peso suavizado de hoje pela linha de tendência */
  currentTrend: number;
  /** último peso realmente registrado */
  lastWeight: number;
  lastDate: string;
  /** número de registros usados */
  points: number;
  /** dias entre o primeiro e o último registro usado */
  spanDays: number;
  /** qualidade do ajuste (0 a 1) */
  r2: number;
}

const DAY = 86_400_000;
const toTime = (d: string) => new Date(`${d}T00:00:00`).getTime();

/** Regressão linear simples sobre os pesos dos últimos `windowDays` dias. */
export function buildProjection(weights: WeightEntry[], windowDays = 60): Projection | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  const lastTime = toTime(sorted.at(-1)!.date);
  const used = sorted.filter((w) => lastTime - toTime(w.date) <= windowDays * DAY);
  if (used.length < 2) return null;

  const base = toTime(used[0]!.date);
  const xs = used.map((w) => (toTime(w.date) - base) / DAY);
  const ys = used.map((w) => w.weight);
  const spanDays = xs.at(-1)!;
  if (spanDays <= 0) return null;

  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;
  const intercept = my - slopePerDay * mx;

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slopePerDay * xs[i]!;
    ssRes += (ys[i]! - pred) ** 2;
    ssTot += (ys[i]! - my) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return {
    slopePerDay,
    ratePerWeek: slopePerDay * 7,
    currentTrend: intercept + slopePerDay * spanDays,
    lastWeight: ys.at(-1)!,
    lastDate: used.at(-1)!.date,
    points: n,
    spanDays,
    r2,
  };
}

/** Peso estimado numa data futura mantendo o ritmo atual. */
export function weightAt(p: Projection, date: string): number {
  const days = (toTime(date) - toTime(p.lastDate)) / DAY;
  return round(p.currentTrend + p.slopePerDay * days, 1);
}

/** Data estimada para atingir um peso alvo, ou null se o ritmo não leva até lá. */
export function dateForWeight(p: Projection, target: number, maxDays = 730): string | null {
  const diff = target - p.currentTrend;
  if (Math.abs(diff) < 0.05) return p.lastDate;
  if (p.slopePerDay === 0) return null;
  const days = diff / p.slopePerDay;
  if (days < 0 || days > maxDays) return null;
  return new Date(toTime(p.lastDate) + days * DAY).toISOString().slice(0, 10);
}

/** Série com histórico + projeção diária até a data final. */
export function projectionSeries(
  weights: WeightEntry[],
  p: Projection,
  until: string,
  step = 7,
): { date: string; real: number | null; projecao: number | null }[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const out = sorted.map((w) => ({ date: w.date, real: w.weight, projecao: null as number | null }));
  const lastReal = out.at(-1);
  if (lastReal) lastReal.projecao = round(p.currentTrend, 1);

  const end = toTime(until);
  let t = toTime(p.lastDate) + step * DAY;
  while (t <= end) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, real: null, projecao: weightAt(p, date) });
    t += step * DAY;
  }
  const endDate = new Date(end).toISOString().slice(0, 10);
  if (out.at(-1)?.date !== endDate && end > toTime(p.lastDate)) {
    out.push({ date: endDate, real: null, projecao: weightAt(p, endDate) });
  }
  return out;
}
