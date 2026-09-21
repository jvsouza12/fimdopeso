import { useStore } from "./store";
import type { Subscription } from "./types";

export const PREMIUM_PRICE_MONTHLY = 50;
export const PREMIUM_PRICE_YEARLY = 500;
export const TRIAL_DAYS = 7;

export const DEFAULT_SUBSCRIPTION: Subscription = { plan: "free" };

export const PREMIUM_FEATURES = [
  {
    id: "assistant",
    title: "Assistente com IA",
    description: "Sugestões de refeições, encaixe de calorias e ajustes conversando com a inteligência artificial.",
  },
  {
    id: "photo",
    title: "Foto do prato e código de barras",
    description: "Registre a refeição tirando uma foto ou lendo o código de barras do produto.",
  },
  {
    id: "insights",
    title: "Projeção e relatórios",
    description: "Estimativa do seu peso futuro e relatórios completos de calorias, proteína, água e evolução.",
  },
] as const;

export function isActive(sub: Subscription | undefined): boolean {
  if (!sub || sub.plan !== "premium") return false;
  if (sub.until) return new Date(`${sub.until}T23:59:59`).getTime() > Date.now();
  return true;
}

export function daysLeft(sub: Subscription | undefined): number | null {
  if (!sub?.until) return null;
  const ms = new Date(`${sub.until}T23:59:59`).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function usePremium() {
  const { state, update } = useStore();
  const subscription = state.settings.subscription ?? DEFAULT_SUBSCRIPTION;
  const premium = isActive(subscription);

  const setSubscription = (next: Subscription) =>
    update((d) => ({ ...d, settings: { ...d.settings, subscription: next } }));

  const startTrial = () => {
    if (subscription.trialUsed) return;
    const until = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString().slice(0, 10);
    setSubscription({
      plan: "premium",
      cycle: "trial",
      since: new Date().toISOString().slice(0, 10),
      until,
      trialUsed: true,
    });
  };

  const cancel = () =>
    setSubscription({ ...subscription, plan: "free", cycle: undefined, until: undefined });

  return {
    subscription,
    premium,
    trial: subscription.cycle === "trial" && premium,
    trialUsed: Boolean(subscription.trialUsed),
    daysLeft: daysLeft(subscription),
    startTrial,
    cancel,
    setSubscription,
  };
}
