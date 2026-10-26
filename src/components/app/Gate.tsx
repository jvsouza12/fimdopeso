import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { useSyncStatus } from "@/lib/cloud-sync";
import type { Profile, Targets } from "@/lib/types";
import { AppShell } from "./AppShell";
import { Onboarding } from "./Onboarding";
import { Landing } from "./Landing";

const PUBLIC_PATHS = ["/auth", "/reset-password"];

/** Pista rápida de que existe uma sessão salva, para não piscar a página pública no recarregamento. */
function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
  } catch {
    return false;
  }
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-label="Carregando"
        role="status"
      />
    </div>
  );
}

export function Gate({ children }: { children: ReactNode }) {
  const { state, hydrated } = useStore();
  const { session, loading: sessionLoading } = useSession();
  const syncStatus = useSyncStatus();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const storedSession = useMemo(() => hasStoredSession(), []);
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  // Depois de entrar, esperamos os dados da conta chegarem da nuvem antes de
  // decidir entre o painel e o cadastro inicial.
  const [accountSettled, setAccountSettled] = useState(false);
  useEffect(() => {
    if (!session) {
      setAccountSettled(false);
      return;
    }
    if (syncStatus === "synced" || syncStatus === "error") {
      setAccountSettled(true);
      return;
    }
    if (accountSettled) return;
    const timer = setTimeout(() => setAccountSettled(true), 4000);
    return () => clearTimeout(timer);
  }, [session, syncStatus, accountSettled]);

  if (PUBLIC_PATHS.includes(normalized)) return <>{children}</>;

  if (!hydrated) {
    // Visitantes sem sessão continuam vendo a apresentação imediatamente.
    if (normalized === "/" && !session && !storedSession) return <Landing />;
    return <LoadingScreen />;
  }

  if (normalized === "/" && !state.onboarded) {
    if (sessionLoading && storedSession) return <LoadingScreen />;
    if (session) return accountSettled ? <Onboarding /> : <LoadingScreen />;
    return <Landing />;
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
