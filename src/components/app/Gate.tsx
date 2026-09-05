import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
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

  if (!state.onboarded || !state.profile || !state.targets) return <Onboarding />;

  return <AppShell>{children}</AppShell>;
}

/** Helper para páginas que precisam do perfil já definido. */
export function useProfile() {
  const { state } = useStore();
  return { profile: state.profile!, targets: state.targets! };
}
