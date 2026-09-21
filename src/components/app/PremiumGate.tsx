import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/lib/premium";

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
      <Crown className="size-3" /> Premium
    </span>
  );
}

export function PremiumGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { premium, trialUsed } = usePremium();
  if (premium) return <>{children}</>;

  return (
    <div className="card-surface flex flex-col items-center gap-4 p-8 text-center">
      <span className="gradient-primary flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
        <Lock className="size-5" />
      </span>
      <div className="space-y-1">
        <h3 className="flex items-center justify-center gap-2 text-lg font-semibold">
          {title} <PremiumBadge />
        </h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="lg">
        <Link to="/premium">{trialUsed ? "Ver planos" : "Testar grátis por 7 dias"}</Link>
      </Button>
    </div>
  );
}
