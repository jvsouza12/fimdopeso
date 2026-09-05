import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface Props {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  /** rota interna para a ação principal */
  to?: string;
  onAction?: () => void;
  children?: ReactNode;
}

/** Estado vazio com uma ação clara para o próximo passo. */
export function EmptyState({ icon, title, description, actionLabel, to, onAction, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-primary">{icon}</span>
      ) : null}
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && to ? (
        <Button asChild className="mt-1">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      ) : actionLabel && onAction ? (
        <Button className="mt-1" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
