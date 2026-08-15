import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/jejum")({
  head: () => ({
    meta: [
      { title: "Jejum intermitente — NutriPlan" },
      { name: "description", content: "Cronômetro de jejum com metas de 12h a 20h, histórico e sequência de jejuns." },
      { property: "og:title", content: "Jejum intermitente — NutriPlan" },
      { property: "og:description", content: "Inicie, acompanhe e finalize seus jejuns com um cronômetro simples." },
    ],
  }),
  component: JejumPage,
});

const OPTIONS = [12, 14, 16, 18, 20];

function JejumPage() {
  const { state, update } = useStore();
  const [hours, setHours] = useState(state.profile?.fastingHours ?? 16);
  const [now, setNow] = useState(Date.now());
  const active = state.fasts.find((f) => !f.endedAt);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = active ? now - active.startedAt : 0;
  const targetMs = (active?.targetHours ?? hours) * 3600_000;
  const pct = Math.min(100, (elapsed / targetMs) * 100);
  const history = state.fasts.filter((f) => f.endedAt).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Jejum" subtitle="Opcional. Use apenas se fizer sentido para a sua rotina." />

      <div className="card-surface flex flex-col items-center p-8">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Tempo de jejum</p>
        <p className="mt-2 text-5xl font-bold tabular-nums">{formatDuration(elapsed)}</p>
        <div className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
          <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>

        {active ? (
          <div className="mt-6 w-full max-w-sm space-y-2 text-center text-sm text-muted-foreground">
            <p>Início: {new Date(active.startedAt).toLocaleTimeString("pt-BR")}</p>
            <p>Previsto: {new Date(active.startedAt + targetMs).toLocaleTimeString("pt-BR")}</p>
            <p>Restante: {formatDuration(Math.max(0, targetMs - elapsed))}</p>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() =>
                update((d) => {
                  toast.success("Jejum finalizado!");
                  return {
                    ...d,
                    fasts: d.fasts.map((f) => (f.id === active.id ? { ...f, endedAt: Date.now() } : f)),
                  };
                })
              }
            >
              Finalizar jejum
            </Button>
          </div>
        ) : (
          <div className="mt-6 w-full max-w-sm space-y-4">
            <div className="flex flex-wrap justify-center gap-2">
              {OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium",
                    hours === h ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-2",
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() =>
                update((d) => ({
                  ...d,
                  fasts: [{ id: crypto.randomUUID(), startedAt: Date.now(), targetHours: hours }, ...d.fasts],
                }))
              }
            >
              Iniciar jejum de {hours}h
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Histórico</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {history.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum jejum concluído ainda.</p>
          )}
          {history.map((f) => (
            <div key={f.id} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {new Date(f.startedAt).toLocaleDateString("pt-BR")} · meta {f.targetHours}h
              </span>
              <span className="font-medium tabular-nums">{formatDuration((f.endedAt ?? 0) - f.startedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
