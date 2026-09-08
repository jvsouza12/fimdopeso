import { describe, expect, it } from "vitest";
import { adaptiveSuggestion } from "../adaptive";
import type { AppState } from "../types";

function makeState(weights: { date: string; weight: number }[]): AppState {
  return {
    version: 1,
    onboarded: true,
    profile: {
      name: "Ana",
      sex: "f",
      age: 30,
      height: 165,
      weight: 75,
      targetWeight: 65,
      activity: "light",
      goal: "lose",
      deadlineWeeks: 20,
      mealsPerDay: 4,
      preferences: "",
      dislikes: "",
      restrictions: [],
      fasting: false,
      fastingHours: 16,
    },
    targets: { kcal: 1800, protein: 120, carbs: 160, fat: 55, water: 2600, fiber: 25, sodium: 2000, sugar: 45 },
    customFoods: [],
    favorites: [],
    recipes: [],
    logs: [],
    plan: [],
    weights: weights.map((w, i) => ({ id: `w${i}`, ...w })),
    measures: [],
    water: [],
    fasts: [],
    goals: [],
    shopping: [],
    settings: { theme: "dark", notifications: {}, autoAdjust: true },
  };
}

describe("adaptiveSuggestion", () => {
  it("retorna null com poucas pesagens", () => {
    expect(adaptiveSuggestion(makeState([{ date: "2026-09-01", weight: 75 }]))).toBeNull();
  });

  it("retorna null quando o intervalo é curto demais", () => {
    const weights = [0, 1, 2, 3].map((d) => ({ date: `2026-09-0${d + 1}`, weight: 75 }));
    expect(adaptiveSuggestion(makeState(weights))).toBeNull();
  });

  it("sugere reduzir calorias quando a perda está lenta demais", () => {
    // sem perda durante 3 semanas com objetivo de emagrecer
    const weights = [75, 75.1, 75, 74.9].map((w, i) => ({ date: `2026-08-${10 + i * 5}`, weight: w }));
    const s = adaptiveSuggestion(makeState(weights));
    expect(s).not.toBeNull();
    expect(s!.deltaKcal).toBeLessThan(0);
    expect(s!.suggested.kcal).toBeLessThan(1800);
    expect(s!.suggested.kcal).toBeGreaterThanOrEqual(1200);
  });

  it("sugere aumentar calorias quando a perda está rápida demais", () => {
    const weights = [70, 71.5, 73, 75].map((w, i) => ({
      date: `2026-08-${String(24 - i * 5).padStart(2, "0")}`,
      weight: w,
    }));
    const s = adaptiveSuggestion(makeState(weights));
    expect(s).not.toBeNull();
    expect(s!.deltaKcal).toBeGreaterThan(0);
  });
});
