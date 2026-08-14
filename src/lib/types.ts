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
  manual?: boolean | undefined;
}

export interface Settings {
  theme: "light" | "dark";
  notifications: Record<string, boolean>;
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
