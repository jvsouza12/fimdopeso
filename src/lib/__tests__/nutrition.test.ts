import { describe, expect, it } from "vitest";
import { bmi, bmiLabel, computeTargets, idealWeightRange, scaleFood, round } from "../nutrition";
import type { Food, Profile } from "../types";

const profile: Profile = {
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
};

describe("computeTargets", () => {
  it("gera metas coerentes para emagrecimento", () => {
    const t = computeTargets(profile);
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
    expect(t.kcal).toBeLessThan(2400);
    expect(t.protein).toBeGreaterThan(0);
    expect(t.water).toBeGreaterThan(1000);
  });

  it("nunca desce abaixo do piso calórico", () => {
    const t = computeTargets({ ...profile, weight: 45, targetWeight: 40, deadlineWeeks: 4 });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });

  it("define metas de fibra, sódio e açúcar", () => {
    const t = computeTargets(profile);
    expect(t.fiber).toBeGreaterThanOrEqual(20);
    expect(t.fiber).toBeLessThanOrEqual(45);
    expect(t.sodium).toBe(2000);
    expect(t.sugar).toBeGreaterThan(0);
  });

  it("ganho de peso pede mais calorias que perda", () => {
    expect(computeTargets({ ...profile, goal: "gain" }).kcal).toBeGreaterThan(computeTargets(profile).kcal);
  });
});

describe("scaleFood", () => {
  const food: Food = {
    id: "x",
    name: "Arroz",
    category: "Grãos",
    portion: 100,
    unit: "g",
    kcal: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    fiber: 0.4,
    sodium: 5,
    sugar: 0.1,
    satFat: 0.1,
  };

  it("escala proporcionalmente", () => {
    const s = scaleFood(food, 200);
    expect(s.kcal).toBeCloseTo(260, 1);
    expect(s.protein).toBeCloseTo(5.4, 1);
  });

  it("propaga micronutrientes", () => {
    const s = scaleFood(food, 50);
    expect(s.sodium).toBeCloseTo(2.5, 1);
    expect(s.sugar).toBeCloseTo(0.05, 2);
    expect(s.satFat).toBeCloseTo(0.05, 2);
  });
});

describe("indicadores de saúde", () => {
  it("calcula IMC e faixa", () => {
    expect(bmi(75, 165)).toBeCloseTo(27.5, 1);
    expect(bmiLabel(27.5)).toBeTruthy();
    const range = idealWeightRange(165);
    expect(range.min).toBeLessThan(range.max);
  });

  it("arredonda com casas decimais", () => {
    expect(round(1.2345, 2)).toBe(1.23);
    expect(round(1.6)).toBe(2);
  });
});
