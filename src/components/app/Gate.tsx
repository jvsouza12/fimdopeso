import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { AppShell } from "./AppShell";
import { Onboarding } from "./Onboarding";

export function Gate({ children }: { children: ReactNode }) {
  const { state, hydrated } = useStore();

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
