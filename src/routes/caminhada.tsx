import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Footprints, Play, Pause, Square, LocateFixed, Wifi, WifiOff, RefreshCw, Loader2, Mountain, Timer, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useWalking } from "@/lib/walking-provider";
import { walkElevationGain, walkKm, walkLivePace, walkPace, walkTime } from "@/lib/walking";
import { WalkingMap } from "@/components/app/WalkingMap";
import { WalkingHistory } from "@/components/app/WalkingHistory";
import { WalkSplits } from "@/components/app/WalkSplits";
import { toast } from "sonner";

export const Route = createFileRoute("/caminhada")({
  head: () => ({ meta: [
    { title: "Caminhada e percursos — CasalPlan" },
    { name: "description", content: "Acompanhe distância, tempo e seus percursos de caminhada com histórico privado na sua conta." },
    { property: "og:title", content: "Caminhada e percursos — CasalPlan" },
    { property: "og:description", content: "Seu tempo, quilômetros e histórico de caminhadas em um só lugar." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: WalkingPage,
});

function WalkingPage() {
  const { session, loading } = useSession();
  const { active, running, autoPaused, locating, elapsed, ready, online, gps, error, syncing, start, pause, finish, retry } = useWalking();
  const activeId = active?.id ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeId) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeId]);

  const distance = active?.distanceMeters ?? 0;
  const wall = active ? Math.max(0, (now - new Date(active.startedAt).getTime()) / 1000) : 0;
  const climb = active ? walkElevationGain(active.points) : 0;
  const livePace = active ? walkLivePace(active.points) : "—";

  return <div className="space-y-6">
    <PageHeader title="Caminhada" subtitle="Um passo de cada vez." action={<span className="flex items-center gap-1.5 text-xs text-muted-foreground">{online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}{online ? "Online" : "Sem internet"}</span>} />
    {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !session ?
      <section className="space-y-4 py-10 text-center"><Footprints className="mx-auto size-10 text-primary" /><h2 className="text-xl font-semibold">Sua caminhada, na sua conta</h2><Button asChild><Link to="/auth">Entrar para caminhar</Link></Button></section> : <>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><LocateFixed className="size-4 text-primary" />{gps}</span>
            <span className="flex flex-wrap items-center gap-2">
              {autoPaused && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Pausa automática sem sinal</span>}
              {active && <span className="text-xs text-muted-foreground">{running ? (autoPaused ? "Aguardando sinal" : "Em andamento") : "Pronta para retomar"}</span>}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-5 rounded-xl border border-border bg-surface py-5 text-center sm:grid-cols-3">
            <div><p className="text-4xl font-bold tabular-nums text-primary">{walkKm(distance)}</p><p className="mt-2 text-xs text-muted-foreground">Quilômetros</p></div>
            <div className="border-l border-border"><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{walkTime(active ? elapsed : 0)}</p><p className="mt-2 text-xs text-muted-foreground">Tempo ativo</p></div>
            <div className="col-span-2 border-t border-border pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pt-0"><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{walkPace(distance, active ? elapsed : 0)}</p><p className="mt-2 text-xs text-muted-foreground">Ritmo médio · min/km</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 font-semibold tabular-nums"><Timer className="size-3.5 text-primary" />{livePace}</p><p className="mt-1 text-xs text-muted-foreground">Ritmo atual</p></div>
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 font-semibold tabular-nums"><TimerReset className="size-3.5 text-primary" />{walkTime(active ? wall : 0)}</p><p className="mt-1 text-xs text-muted-foreground">Tempo decorrido</p></div>
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 font-semibold tabular-nums"><Mountain className="size-3.5 text-primary" />{climb} m</p><p className="mt-1 text-xs text-muted-foreground">Subida</p></div>
          </div>
          <WalkingMap points={active?.points ?? []} online={online} live={running && !autoPaused} />
          <div className="flex gap-3">
            <Button className="h-12 flex-1" disabled={!ready} onClick={running || locating ? pause : start}>{locating ? <Loader2 className="animate-spin" /> : running ? <Pause /> : <Play />}{locating ? "Cancelar busca do GPS" : running ? "Pausar" : active ? "Retomar caminhada" : "Iniciar caminhada"}</Button>
            {active && <Button className="h-12" variant="outline" onClick={() => { void finish().then(() => toast.success("Caminhada salva")).catch(() => toast.error("Não foi possível salvar. Tente novamente.")); }}><Square />Finalizar</Button>}
          </div>
          {!ready && !error && <p role="status" className="text-sm text-muted-foreground">Carregando caminhadas deste aparelho…</p>}
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-warning"><p className="min-w-0 flex-1">{error}</p><Button size="sm" variant="ghost" onClick={retry} disabled={syncing} aria-label={ready ? "Tentar salvar no aparelho" : "Tentar carregar caminhadas"}><RefreshCw />Tentar novamente</Button></div>}
          {active && active.points.length > 1 && <WalkSplits walk={active} />}
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
            <p>Ligue a localização e permita o acesso ao iniciar. O GPS registra o percurso com marcas a cada quilômetro, parciais, ritmo e elevação, tudo sem internet. O círculo indica a precisão do último ponto.</p>
            <p>O tempo ativo pausa sozinho quando o GPS passa 45 segundos sem entregar posição e volta a contar quando o sinal retorna; trechos separados por pausa ou perda de sinal não somam distância entre si. Use Pausar quando descansar.</p>
            <p>A gravação continua quando você troca de aplicativo ou bloqueia a tela, se o navegador mantiver o GPS rodando em segundo plano. Se o sistema interromper o GPS, o cronômetro não conta e o percurso retoma de onde parou ao abrir de novo.</p>
            <p>Antes de sair, entre na sua conta e carregue esta página na versão publicada com internet. As caminhadas ficam neste navegador, separadas por conta; limpar os dados do site apaga o histórico local. Cada caminhada concluída pode ser exportada em GPX.</p>
          </div>
        </section>
        <WalkingHistory />
      </>}
  </div>;
}
