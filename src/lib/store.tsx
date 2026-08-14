import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FOODS } from "@/data/foods";
import type { AppState, Food, LogEntry } from "./types";
import { scaleFood } from "./nutrition";
import { todayKey } from "./date";

const KEY = "nutriplan.state.v1";

export const initialState: AppState = {
  version: 1,
  onboarded: false,
  profile: null,
  targets: null,
  customFoods: [],
  favorites: [],
  recipes: [],
  logs: [],
  plan: [],
  weights: [],
  measures: [],
  water: [],
  fasts: [],
  goals: [],
  shopping: [],
  settings: {
    theme: "dark",
    notifications: {
      water: true,
      meals: true,
      weight: true,
      fasting: false,
      daily: true,
    },
  },
};

interface Ctx {
  state: AppState;
  hydrated: boolean;
  update: (fn: (draft: AppState) => AppState) => void;
  reset: () => void;
  allFoods: Food[];
  addLog: (input: {
    meal: LogEntry["meal"];
    food?: Food;
    recipeId?: string;
    name?: string;
    amount: number;
    macros?: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
    date?: string;
  }) => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as AppState) });
    } catch {
      /* ignora dados corrompidos */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
    const root = document.documentElement;
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state, hydrated]);

  const update = useCallback((fn: (draft: AppState) => AppState) => {
    setState((prev) => fn(structuredClone(prev)));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(initialState);
  }, []);

  const allFoods = useMemo(() => [...state.customFoods, ...FOODS], [state.customFoods]);

  const addLog: Ctx["addLog"] = useCallback(
    ({ meal, food, recipeId, name, amount, macros, date }) => {
      const m = macros ?? (food ? scaleFood(food, amount) : { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        date: date ?? todayKey(),
        meal,
        foodId: food?.id,
        recipeId,
        name: name ?? food?.name ?? "Item",
        amount,
        ...m,
      };
      setState((prev) => ({ ...prev, logs: [entry, ...prev.logs] }));
    },
    [],
  );

  const value = useMemo(
    () => ({ state, hydrated, update, reset, allFoods, addLog }),
    [state, hydrated, update, reset, allFoods, addLog],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}

export function useDayTotals(date = todayKey()) {
  const { state } = useStore();
  return useMemo(() => {
    const logs = state.logs.filter((l) => l.date === date);
    return logs.reduce(
      (acc, l) => ({
        kcal: acc.kcal + l.kcal,
        protein: acc.protein + l.protein,
        carbs: acc.carbs + l.carbs,
        fat: acc.fat + l.fat,
        fiber: acc.fiber + l.fiber,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }, [state.logs, date]);
}
