import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FOODS } from "@/data/foods";
import type { AppState, Food, LogEntry } from "./types";
import { scaleFood } from "./nutrition";
import { todayKey } from "./date";
import { useSession } from "@/hooks/useSession";

// O armazenamento legado compartilhado fica preservado, sem atribuição automática.
const KEY = "nutriplan.state.v1";

function AccountLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Carregando seus dados…</p>
    </div>
  );
}

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
    reminders: {
      waterEveryMin: 120,
      mealTimes: ["08:00", "12:30", "16:00", "20:00"],
      dailyTime: "21:00",
      weightWeekday: 1,
    },
    autoAdjust: true,
  },
};

interface Ctx {
  state: AppState;
  hydrated: boolean;
  accountId: string | null;
  update: (fn: (draft: AppState) => AppState) => void;
  reset: () => void;
  allFoods: Food[];
  addLog: (input: {
    meal: LogEntry["meal"];
    food?: Food;
    recipeId?: string;
    name?: string;
    amount: number;
    macros?: {
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar?: number;
      sodium?: number;
      satFat?: number;
    };
    date?: string;
  }) => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <AccountLoading />;
  const accountId = session?.user.id ?? null;

  // Remontar também encerra os efeitos e diálogos vinculados à conta anterior.
  return (
    <AccountStoreProvider key={accountId ?? "guest"} accountId={accountId}>
      {children}
    </AccountStoreProvider>
  );
}

function AccountStoreProvider({ children, accountId }: { children: ReactNode; accountId: string | null }) {
  const storageKey = accountId ? `${KEY}:account:${accountId}` : `${KEY}:guest`;
  const [state, setState] = useState<AppState>(() => structuredClone(initialState));
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as AppState;
        setState({
          ...initialState,
          ...saved,
          settings: {
            ...initialState.settings,
            ...(saved.settings ?? {}),
            notifications: {
              ...initialState.settings.notifications,
              ...(saved.settings?.notifications ?? {}),
            },
            reminders: {
              ...initialState.settings.reminders,
              ...(saved.settings?.reminders ?? {}),
            },
          },
        });
      }
    } catch {
      /* ignora dados corrompidos */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError("As últimas alterações não foram salvas neste aparelho. Libere espaço ou permita o armazenamento e tente novamente antes de fechar a página.");
    }
    const root = document.documentElement;
    root.classList.toggle("dark", state.settings.theme === "dark");
  }, [state, hydrated, storageKey]);

  const update = useCallback((fn: (draft: AppState) => AppState) => {
    setState((prev) => fn(structuredClone(prev)));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      setStorageError("Não foi possível apagar os dados salvos neste aparelho. Permita o armazenamento e tente novamente.");
      return;
    }
    setState(structuredClone(initialState));
  }, [storageKey]);

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
    () => ({ state, hydrated, accountId, update, reset, allFoods, addLog }),
    [state, hydrated, accountId, update, reset, allFoods, addLog],
  );

  return (
    <StoreContext.Provider value={value}>
      {hydrated ? (
        <>
          {storageError && (
            <div role="alert" className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-b border-destructive/30 bg-background px-4 py-3 text-sm text-foreground">
              <p className="max-w-2xl">{storageError}</p>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => setState((prev) => structuredClone(prev))}
              >
                Tentar salvar novamente
              </button>
            </div>
          )}
          {children}
        </>
      ) : <AccountLoading />}
    </StoreContext.Provider>
  );
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
        sugar: acc.sugar + (l.sugar ?? 0),
        sodium: acc.sodium + (l.sodium ?? 0),
        satFat: acc.satFat + (l.satFat ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, satFat: 0 },
    );
  }, [state.logs, date]);
}
