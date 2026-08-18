import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { AppShell } from "./AppShell";
import { Onboarding } from "./Onboarding";

const PUBLIC_PATHS = ["/auth", "/reset-password"];

export function Gate({ children }: { children: ReactNode }) {
  const { state, hydrated } = useStore();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>;

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
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
