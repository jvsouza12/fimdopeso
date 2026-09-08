import { describe, expect, it } from "vitest";
import { buildProjection, dateForWeight, weightAt } from "../projection";
import type { WeightEntry } from "../types";

const w = (date: string, weight: number): WeightEntry => ({ id: date, date, weight });

describe("projection", () => {
  const weights = [w("2026-01-01", 90), w("2026-01-08", 89), w("2026-01-15", 88), w("2026-01-22", 87)];

  it("retorna null com menos de dois registros", () => {
    expect(buildProjection([w("2026-01-01", 90)])).toBeNull();
  });

  it("calcula ritmo semanal de perda", () => {
    const p = buildProjection(weights)!;
    expect(p.ratePerWeek).toBeCloseTo(-1, 5);
    expect(p.r2).toBeCloseTo(1, 5);
    expect(p.currentTrend).toBeCloseTo(87, 5);
  });

  it("projeta peso futuro mantendo o ritmo", () => {
    const p = buildProjection(weights)!;
    expect(weightAt(p, "2026-02-19")).toBeCloseTo(83, 5);
  });

  it("estima a data para atingir a meta", () => {
    const p = buildProjection(weights)!;
    expect(dateForWeight(p, 84)).toBe("2026-02-12");
    expect(dateForWeight(p, 95)).toBeNull();
  });
});
