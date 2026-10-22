import type { Reminders, Settings } from "./types";
import { registerAppWorker } from "./pwa";

export const DEFAULT_REMINDERS: Reminders = {
  waterEveryMin: 120,
  mealTimes: ["08:00", "12:30", "16:00", "20:00"],
  dailyTime: "21:00",
  weightWeekday: 1,
};

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Registra o service worker (necessário para notificações no celular). */
export async function registerServiceWorker() {
  return registerAppWorker();
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") await registerServiceWorker();
  return result;
}

export async function showNotification(title: string, body: string, url = "/") {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: title,
    data: { url },
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    /* navegador bloqueou */
  }
}

const FIRED_KEY = "nutriplan.reminders.fired";

function loadFired(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveFired(map: Record<string, string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export interface ReminderContext {
  settings: Settings;
  waterMl: number;
  waterTarget: number;
  kcal: number;
  kcalTarget: number;
  loggedMealsToday: number;
  weighedToday: boolean;
}

export interface DueReminder {
  key: string;
  title: string;
  body: string;
  url: string;
}

/** Calcula quais lembretes estão pendentes neste minuto. */
export function dueReminders(now: Date, ctx: ReminderContext, fired: Record<string, string>): DueReminder[] {
  const r = { ...DEFAULT_REMINDERS, ...(ctx.settings.reminders ?? {}) };
  const on = ctx.settings.notifications ?? {};
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const time = hhmm(now);
  const out: DueReminder[] = [];

  const push = (key: string, title: string, body: string, url: string) => {
    if (fired[key]) return;
    out.push({ key, title, body, url });
  };

  if (on["water"] && ctx.waterMl < ctx.waterTarget) {
    const interval = Math.max(30, r.waterEveryMin);
    const slot = Math.floor((now.getHours() * 60 + now.getMinutes()) / interval);
    if (now.getHours() >= 7 && now.getHours() <= 22) {
      push(
        `water:${dayKey}:${slot}`,
        "Hora de beber água",
        `Faltam ${Math.max(0, ctx.waterTarget - ctx.waterMl)} ml para sua meta de hoje.`,
        "/agua",
      );
    }
  }

  if (on["meals"]) {
    r.mealTimes.forEach((t, i) => {
      if (t === time) {
        push(`meal:${dayKey}:${i}`, "Hora da refeição", "Registre o que você comeu para manter suas metas em dia.", "/registrar");
      }
    });
  }

  if (on["weight"] && now.getDay() === r.weightWeekday && time === "08:00" && !ctx.weighedToday) {
    push(`weight:${dayKey}`, "Pesagem da semana", "Registre seu peso para acompanhar a evolução.", "/evolucao");
  }

  if (on["daily"] && time === r.dailyTime) {
    const left = Math.max(0, Math.round(ctx.kcalTarget - ctx.kcal));
    push(
      `daily:${dayKey}`,
      "Resumo do seu dia",
      left > 0
        ? `Você consumiu ${Math.round(ctx.kcal)} kcal — restam ${left} kcal da sua meta.`
        : `Você atingiu sua meta de ${ctx.kcalTarget} kcal hoje. Bom trabalho!`,
      "/relatorios",
    );
  }

  return out;
}

export function markFired(keys: string[]) {
  const fired = loadFired();
  const stamp = new Date().toISOString();
  for (const k of keys) fired[k] = stamp;
  // limpa registros antigos (mais de 3 dias)
  const cutoff = Date.now() - 3 * 86_400_000;
  for (const [k, v] of Object.entries(fired)) {
    if (new Date(v).getTime() < cutoff) delete fired[k];
  }
  saveFired(fired);
}

export const getFired = loadFired;
