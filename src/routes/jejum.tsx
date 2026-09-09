import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FAST_STAGES, stageAt, nextStage, stageIndexAt, stageProgress } from "@/lib/fasting";
import { Check, Flame, Info, Play, Square, Trophy } from "lucide-react";

export const Route = createFileRoute("/jejum")({
  head: () => ({
    meta: [
      { title: "Jejum intermitente e estágios metabólicos — NutriPlan" },
      {
        name: "description",
        content:
          "Cronômetro de jejum que mostra em qual estágio metabólico você está: queima de gordura, cetose e autofagia, com histórico e sequência.",
      },
      { property: "og:title", content: "Jejum intermitente e estágios metabólicos — NutriPlan" },
      {
        property: "og:description",
        content: "Acompanhe o tempo de jejum e veja o que acontece no seu corpo a cada hora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JejumPage,
});

const OPTIONS = [12, 14, 16, 18, 20, 24];

function StageRing({ hours, pct, elapsed }: { hours: number; pct: number; elapsed: number }) {
  const size = 248;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const stage = stageAt(hours);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          className="stroke-primary transition-all duration-700 ease-out"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl" aria-hidden>
          {stage.emoji}
        </span>
        <span className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatDuration(elapsed)}</span>
        <span className="mt-1 text-xs font-medium tracking-wide text-primary uppercase">{stage.name}</span>
      </div>
    </div>
  );
}

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
  const elapsedHours = elapsed / 3600_000;
  const targetMs = (active?.targetHours ?? hours) * 3600_000;
  const pct = Math.min(100, (elapsed / targetMs) * 100);
  const history = state.fasts.filter((f) => f.endedAt).slice(0, 10);
  const completed = state.fasts.filter((f) => f.endedAt).length;
  const best = state.fasts.reduce((m, f) => Math.max(m, (f.endedAt ?? 0) - f.startedAt), 0);

  const current = stageAt(active ? elapsedHours : 0);
  const currentIndex = stageIndexAt(active ? elapsedHours : 0);
  const next = nextStage(active ? elapsedHours : 0);
  const toNextMs = next ? Math.max(0, next.from * 3600_000 - elapsed) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jejum"
        subtitle="Acompanhe em tempo real o que está acontecendo no seu corpo a cada hora de jejum."
      />

      <div className="card-surface flex flex-col items-center p-8">
        <StageRing hours={active ? elapsedHours : 0} pct={active ? pct : 0} elapsed={elapsed} />

        {active ? (
          <div className="mt-6 w-full max-w-md space-y-5">
            <p className="text-center text-sm text-muted-foreground">{current.description}</p>

            <div className="flex flex-wrap justify-center gap-2">
              {current.benefits.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {b}
                </span>
              ))}
            </div>

            {next && (
              <div className="rounded-2xl border border-border bg-surface-2 p-4 text-center text-sm">
                <p className="text-muted-foreground">
                  Próximo estágio <span className="font-semibold text-foreground">{next.emoji} {next.name}</span> em
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{formatDuration(toNextMs)}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <Stat label="Início" value={new Date(active.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
              <Stat label="Meta" value={new Date(active.startedAt + targetMs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
              <Stat label="Restante" value={formatDuration(Math.max(0, targetMs - elapsed))} />
            </div>

            <Button
              className="w-full"
              variant="secondary"
              onClick={() =>
                update((d) => {
                  toast.success(`Jejum de ${formatDuration(elapsed)} finalizado!`);
                  return {
                    ...d,
                    fasts: d.fasts.map((f) => (f.id === active.id ? { ...f, endedAt: Date.now() } : f)),
                  };
                })
              }
            >
              <Square className="size-4" /> Finalizar jejum
            </Button>
          </div>
        ) : (
          <div className="mt-6 w-full max-w-md space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Escolha a duração e comece. O app avisa quando você entrar em cada estágio.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                    hours === h
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2 hover:border-primary/40",
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
              <Play className="size-4" /> Iniciar jejum de {hours}h
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCard icon={<Trophy className="size-4" />} label="Jejuns concluídos" value={String(completed)} />
        <MiniCard icon={<Flame className="size-4" />} label="Maior jejum" value={best ? formatDuration(best) : "—"} />
        <MiniCard
          icon={<Info className="size-4" />}
          label="Estágio atual"
          value={active ? current.short : "Sem jejum ativo"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Estágios do jejum</h2>
        <ol className="space-y-2">
          {FAST_STAGES.map((s, i) => {
            const done = active ? i < currentIndex : false;
            const isCurrent = active ? i === currentIndex : false;
            return (
              <li
                key={s.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  isCurrent ? "border-primary bg-primary/5" : "border-border bg-surface",
                  done && "opacity-70",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl text-base",
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-surface-2",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="size-4" /> : s.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {s.name}
                        {isCurrent && <span className="ml-2 text-xs font-medium text-primary">agora</span>}
                      </p>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {s.to === null ? `${s.from}h+` : `${s.from}–${s.to}h`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    {isCurrent && (
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="gradient-primary h-full rounded-full transition-all"
                          style={{ width: `${stageProgress(elapsedHours) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Tempos aproximados, baseados na literatura sobre jejum intermitente (Anton et al., Obesity 2018; de Cabo &
          Mattson, NEJM 2019). Variam conforme a última refeição, treino e metabolismo. Não substitui orientação médica.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight">Histórico</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {history.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum jejum concluído ainda.</p>
          )}
          {history.map((f) => {
            const dur = (f.endedAt ?? 0) - f.startedAt;
            const st = stageAt(dur / 3600_000);
            return (
              <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(f.startedAt).toLocaleDateString("pt-BR")} · meta {f.targetHours}h
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {st.emoji} {st.name}
                  </span>
                  <span className="font-medium tabular-nums">{formatDuration(dur)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-2 py-3">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}
