import { useEffect, useRef } from "react";
import { useStore, useDayTotals } from "@/lib/store";
import { todayKey } from "@/lib/date";
import { dueReminders, getFired, markFired, registerServiceWorker, showNotification } from "@/lib/notifications";

/**
 * Dispara os lembretes configurados (água, refeições, peso e resumo diário)
 * enquanto o app estiver aberto ou em segundo plano na aba.
 */
export function Reminders() {
  const { state, hydrated } = useStore();
  const totals = useDayTotals();
  const stateRef = useRef(state);
  const totalsRef = useRef(totals);
  stateRef.current = state;
  totalsRef.current = totals;

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    void registerServiceWorker();

    const tick = () => {
      const s = stateRef.current;
      if (!s.targets) return;
      const today = todayKey();
      const due = dueReminders(
        new Date(),
        {
          settings: s.settings,
          waterMl: s.water.find((w) => w.date === today)?.ml ?? 0,
          waterTarget: s.targets.water,
          kcal: totalsRef.current.kcal,
          kcalTarget: s.targets.kcal,
          loggedMealsToday: s.logs.filter((l) => l.date === today).length,
          weighedToday: s.weights.some((w) => w.date === today),
        },
        getFired(),
      );
      if (due.length === 0) return;
      markFired(due.map((d) => d.key));
      due.forEach((d) => void showNotification(d.title, d.body, d.url));
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hydrated]);

  return null;
}
