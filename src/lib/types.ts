export type Sex = "m" | "f";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "athlete";
export type MealType = "breakfast" | "lunch" | "snack" | "dinner" | "extra";

export interface Food {
  id: string;
  name: string;
  category: string;
  /** nutrients per `portion` grams/ml */
  portion: number;
  unit: "g" | "ml" | "un";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** micronutrientes opcionais (por `portion`) */
  sugar?: number | undefined;
  sodium?: number | undefined; // mg
  satFat?: number | undefined;
  brand?: string | undefined;
  barcode?: string | undefined;
  source?: "local" | "custom" | "off" | "ai" | undefined;
  custom?: boolean | undefined;
}

export interface RecipeIngredient {
  foodId: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
}

export interface LogEntry {
  id: string;
  date: string; // yyyy-MM-dd
  meal: MealType;
  foodId?: string | undefined;
  recipeId?: string | undefined;
  name: string;
  amount: number; // grams / ml / units
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number | undefined;
  sodium?: number | undefined;
  satFat?: number | undefined;
}

export interface PlanEntry {
  id: string;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
  meal: MealType;
  foodId?: string | undefined;
  recipeId?: string | undefined;
  name: string;
  amount: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  note?: string | undefined;
}

export interface MeasureEntry {
  id: string;
  date: string;
  waist?: number | undefined;
  abdomen?: number | undefined;
  hip?: number | undefined;
  arm?: number | undefined;
  chest?: number | undefined;
  thigh?: number | undefined;
}

export interface WaterEntry {
  date: string;
  ml: number;
}

export interface FastSession {
  id: string;
  startedAt: number;
  targetHours: number;
  endedAt?: number | undefined;
}

export interface UserGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  done?: boolean | undefined;
}

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  height: number; // cm
  weight: number; // kg
  targetWeight: number;
  activity: ActivityLevel;
  goal: Goal;
  mealsPerDay: number;
  restrictions: string[];
  preferences: string;
  dislikes: string;
  fasting: boolean;
  fastingHours: number;
  deadlineWeeks: number;
  avatar?: string | undefined;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // ml
  fiber?: number | undefined;
  sodium?: number | undefined; // mg (limite diário)
  sugar?: number | undefined; // g (limite diário)
  manual?: boolean | undefined;
}

export interface Reminders {
  /** intervalo em minutos para o lembrete de água */
  waterEveryMin: number;
  /** horários "HH:MM" das refeições */
  mealTimes: string[];
  /** horário do resumo diário */
  dailyTime: string;
  /** 0 = domingo ... 6 = sábado */
  weightWeekday: number;
}

export type SubscriptionPlan = "free" | "premium";

export interface Subscription {
  plan: SubscriptionPlan;
  cycle?: "monthly" | "yearly" | "trial" | undefined;
  /** data de início (yyyy-MM-dd) */
  since?: string | undefined;
  /** data de expiração do teste grátis (yyyy-MM-dd) */
  until?: string | undefined;
  trialUsed?: boolean | undefined;
}

export interface Settings {
  theme: "light" | "dark";
  notifications: Record<string, boolean>;
  reminders?: Reminders | undefined;
  /** ajuste automático de metas conforme a evolução real do peso */
  autoAdjust?: boolean | undefined;
  subscription?: Subscription | undefined;
}

export interface AppState {
  version: number;
  onboarded: boolean;
  profile: Profile | null;
  targets: Targets | null;
  customFoods: Food[];
  favorites: string[];
  recipes: Recipe[];
  logs: LogEntry[];
  plan: PlanEntry[];
  weights: WeightEntry[];
  measures: MeasureEntry[];
  water: WaterEntry[];
  fasts: FastSession[];
  goals: UserGoal[];
  shopping: { id: string; name: string; qty: string; category: string; done: boolean }[];
  settings: Settings;
}
