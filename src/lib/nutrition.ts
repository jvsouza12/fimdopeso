import type { ActivityLevel, Food, Goal, Profile, Targets } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  light: "Levemente ativo",
  moderate: "Moderadamente ativo",
  high: "Muito ativo",
  athlete: "Atleta",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Emagrecer",
  maintain: "Manter peso",
  gain: "Ganhar massa",
};

/** Mifflin-St Jeor */
export function bmr(p: Pick<Profile, "sex" | "weight" | "height" | "age">) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(p.sex === "m" ? base + 5 : base - 161);
}

export function tdee(p: Pick<Profile, "sex" | "weight" | "height" | "age" | "activity">) {
  return Math.round(bmr(p) * ACTIVITY_FACTORS[p.activity]);
}

export function bmi(weight: number, heightCm: number) {
  const h = heightCm / 100;
  return weight / (h * h);
}

export function bmiLabel(value: number) {
  if (value < 18.5) return "Abaixo do peso";
  if (value < 25) return "Faixa considerada saudável";
  if (value < 30) return "Sobrepeso";
  return "Obesidade";
}

export function idealWeightRange(heightCm: number): [number, number] {
  const h = heightCm / 100;
  return [Math.round(18.5 * h * h), Math.round(24.9 * h * h)];
}

export function computeTargets(p: Profile): Targets {
  const maintenance = tdee(p);
  let kcal = maintenance;
  if (p.goal === "lose") kcal = Math.round(maintenance * 0.8);
  if (p.goal === "gain") kcal = Math.round(maintenance * 1.1);
  // piso de segurança
  kcal = Math.max(kcal, p.sex === "m" ? 1500 : 1200);

  const proteinPerKg = p.goal === "lose" ? 2 : p.goal === "gain" ? 1.9 : 1.6;
  const refWeight = p.goal === "lose" ? Math.max(p.targetWeight, p.weight * 0.85) : p.weight;
  const protein = Math.round(proteinPerKg * refWeight);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((p.weight * 35) / 50) * 50;

  return { kcal, protein, carbs, fat, water };
}

export function scaleFood(food: Food, amount: number) {
  const f = amount / food.portion;
  return {
    kcal: food.kcal * f,
    protein: food.protein * f,
    carbs: food.carbs * f,
    fat: food.fat * f,
    fiber: food.fiber * f,
  };
}

export const round = (n: number, d = 0) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};
