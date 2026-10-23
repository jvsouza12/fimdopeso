import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import type { Profile, Targets } from "@/lib/types";
import { AppShell } from "./AppShell";
import { Onboarding } from "./Onboarding";
import { Landing } from "./Landing";

const PUBLIC_PATHS = ["/auth", "/reset-password"];

export function Gate({ children }: { children: ReactNode }) {
  const { state, hydrated } = useStore();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (PUBLIC_PATHS.includes(normalized)) return <>{children}</>;

  // A página inicial é pública: mostra a apresentação do produto para quem
  // ainda não montou o plano (e durante a renderização no servidor).
  if (normalized === "/" && (!hydrated || !state.onboarded)) return <Landing />;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" aria-label="Carregando" role="status" />
      </div>
    );
  }

  // Caminhadas usam apenas a conta e não precisam de peso ou metas alimentares.
  if (normalized === "/caminhada") return <AppShell>{children}</AppShell>;

  if (!state.onboarded || !state.profile || !state.targets) return <Onboarding />;

  return <AppShell>{children}</AppShell>;
}

/** Perfil padrão usado só como proteção contra renderizações fora do Gate. */
const FALLBACK_PROFILE: Profile = {
  name: "",
  age: 30,
  sex: "m",
  height: 170,
  weight: 70,
  targetWeight: 70,
  activity: "moderate",
  goal: "maintain",
  mealsPerDay: 4,
  restrictions: [],
  preferences: "",
  dislikes: "",
  fasting: false,
  fastingHours: 16,
  deadlineWeeks: 12,
};

const FALLBACK_TARGETS: Targets = {
  kcal: 2000,
  protein: 120,
  carbs: 220,
  fat: 65,
  water: 2500,
  fiber: 25,
  sodium: 2000,
  sugar: 50,
};

/** Helper para páginas que precisam do perfil já definido. */
export function useProfile() {
  const { state } = useStore();
  return {
    profile: state.profile ?? FALLBACK_PROFILE,
    targets: state.targets ?? FALLBACK_TARGETS,
  };
}
