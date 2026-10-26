import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { OfflinePreparation } from "@/components/app/OfflinePreparation";
import { Footprints, Play, Pause, Square, LocateFixed, Wifi, WifiOff, RefreshCw, Loader2, Flag, Signal, Activity, TimerReset } from "lucide-react";
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
  const { active, running, autoPaused, locating, elapsed, ready, online, gps, error, syncing, saveStatus, savedAt, cloudStatus, cloudPending, cloudMessage, start, pause, finish, retry, syncCloud } = useWalking();
  const [finishing, setFinishing] = useState(false);
  const finishLock = useRef(false);
  async function finishWalk() {
    if (finishLock.current) return;
    finishLock.current = true;
    setFinishing(true);
    try {
      await finish();
      toast.success("Caminhada salva neste aparelho");
    } catch {
      toast.error("A gravação não foi confirmada. Não feche o app e use Tentar novamente.");
    } finally {
      finishLock.current = false;
      setFinishing(false);
    }
  }
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
  const kmDone = Math.floor(distance / 1000);
  const kmProgress = Math.min(100, ((distance % 1000) / 1000) * 100);
  const nextKm = kmDone + 1;
  const toNextKm = Math.max(0, nextKm * 1000 - distance);
  const statusLabel = locating ? "Buscando sinal" : autoPaused ? "Pausa automática" : running ? "Gravando" : active ? "Pausada" : "Pronta para começar";
  const statusDot = locating ? "bg-sky-400 animate-pulse" : autoPaused ? "bg-amber-400" : running ? "bg-emerald-400 animate-pulse" : active ? "bg-white/40" : "bg-white/25";

  return <div className="space-y-6">
    <PageHeader title="Caminhada" subtitle="Um passo de cada vez." action={<span className="flex items-center gap-1.5 text-xs text-muted-foreground">{online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}{online ? "Online" : "Sem internet"}</span>} />
    {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !session ?
      <section className="space-y-4 py-10 text-center"><Footprints className="mx-auto size-10 text-primary" /><h2 className="text-xl font-semibold">Sua caminhada, na sua conta</h2><Button asChild><Link to="/auth">Entrar para caminhar</Link></Button></section> : <>
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-lg">
            <div className="flex items-center justify-between px-5 pt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${statusDot}`} />{statusLabel}</span>
              <span className="flex items-center gap-1.5">{online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{online ? "Online" : "Offline"}</span>
            </div>
            <div className="px-5 pb-5 pt-3 text-center">
              <p className="text-6xl font-black leading-none tracking-tight tabular-nums">{walkKm(distance)}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/45">Quilômetros</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 text-center">
              <div className="px-2 py-4"><p className="text-lg font-bold tabular-nums">{walkTime(active ? elapsed : 0)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">Tempo ativo</p></div>
              <div className="px-2 py-4"><p className="text-lg font-bold tabular-nums">{walkPace(distance, active ? elapsed : 0)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">Ritmo médio</p></div>
              <div className="px-2 py-4"><p className="text-lg font-bold tabular-nums">{climb} m</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">Subida</p></div>
            </div>
          </div>

          {active && <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Flag className="size-3.5 text-primary" />Próximo marco: km {nextKm}</span>
              <span className="tabular-nums">{toNextKm < 1000 ? `${Math.round(toNextKm)} m` : "—"}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(kmProgress)} aria-label="Progresso até o próximo quilômetro">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${kmProgress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{kmDone > 0 ? `${kmDone} ${kmDone === 1 ? "quilômetro completo" : "quilômetros completos"} neste percurso` : "Primeiro quilômetro em andamento"}</p>
          </div>}

          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums"><Activity className="size-3.5 text-primary" />{livePace}</p><p className="mt-1 text-xs text-muted-foreground">Ritmo atual</p></div>
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums"><TimerReset className="size-3.5 text-primary" />{walkTime(active ? wall : 0)}</p><p className="mt-1 text-xs text-muted-foreground">Tempo decorrido</p></div>
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 text-sm font-semibold tabular-nums"><Flag className="size-3.5 text-primary" />{kmDone}</p><p className="mt-1 text-xs text-muted-foreground">Marcos de km</p></div>
            <div className="rounded-lg border border-border bg-surface px-2 py-3"><p className="flex items-center justify-center gap-1 text-sm font-semibold"><Signal className="size-3.5 text-primary" />{locating ? "Buscando" : autoPaused ? "Fraco" : active ? "Bom" : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Sinal do GPS</p></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><LocateFixed className="size-4 text-primary" />{gps}</span>
            <span className="flex flex-wrap items-center gap-2">
              {autoPaused && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Pausa automática sem sinal</span>}
              {active && <span className="text-xs text-muted-foreground">{running ? (autoPaused ? "Aguardando sinal" : "Gravando percurso") : "Pronta para retomar"}</span>}
            </span>
          </div>

          <WalkingMap points={active?.points ?? []} online={online} live={running && !autoPaused} />

          <div className="flex gap-3">
            <Button className="h-12 flex-1" disabled={!ready || finishing} onClick={running || locating ? pause : start}>{locating ? <Loader2 className="animate-spin" /> : running ? <Pause /> : <Play />}{finishing ? "Salvando caminhada…" : locating ? "Cancelar busca do GPS" : running ? "Pausar" : active ? "Retomar caminhada" : "Iniciar caminhada"}</Button>
            {(active || finishing) && <Button className="h-12" variant="outline" disabled={finishing} onClick={() => { void finishWalk(); }}>{finishing ? <Loader2 className="animate-spin" /> : <Square />}{finishing ? "Salvando…" : "Finalizar"}</Button>}
          </div>

          {ready && <div role="status" className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
            <p className="font-medium">{saveStatus === "saving" ? "Gravando no aparelho…" : saveStatus === "saved" ? "Gravação local confirmada" : saveStatus === "error" ? "Gravação local não confirmada" : "Aguardando gravação local"}</p>
            {savedAt !== null && <p className="mt-1 text-xs text-muted-foreground">Última confirmação: {new Date(savedAt).toLocaleTimeString("pt-BR")}. Esta confirmação não representa envio à nuvem.</p>}
            {saveStatus === "error" && <p className="mt-1 text-xs text-warning">Não feche o aplicativo. Libere espaço e use Tentar novamente abaixo.</p>}
          </div>}

          <OfflinePreparation online={online} />

          {ready && <div role="status" className="space-y-2 rounded-lg border border-border bg-surface p-4 text-sm text-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Backup na sua conta</p>
              <span className="text-xs text-muted-foreground">{cloudPending > 0 ? `${cloudPending} ${cloudPending === 1 ? "caminhada na fila" : "caminhadas na fila"}` : "Fila vazia"}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{cloudMessage || "As caminhadas concluídas ficam numa fila neste aparelho, separada por conta, e são enviadas para a sua conta assim que houver internet."}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" disabled={cloudStatus === "sending" || !online} onClick={() => syncCloud()}>{cloudStatus === "sending" ? <Loader2 className="animate-spin" /> : <RefreshCw />}{cloudStatus === "sending" ? "Enviando…" : "Enviar agora"}</Button>
              <span className="text-xs text-muted-foreground">{cloudStatus === "sending" ? "Enviando para a conta…" : cloudStatus === "error" ? "Envio pendente · a fila continua no aparelho" : cloudStatus === "done" ? "Em dia com a conta" : online ? "Aguardando envio" : "Sem internet"}</span>
            </div>
          </div>}

          {!ready && !error && <p role="status" className="text-sm text-muted-foreground">Carregando caminhadas deste aparelho…</p>}
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-warning"><p className="min-w-0 flex-1">{error}</p><Button size="sm" variant="ghost" onClick={retry} disabled={syncing} aria-label={ready ? "Tentar salvar no aparelho" : "Tentar carregar caminhadas"}><RefreshCw />Tentar novamente</Button></div>}

          {active && active.points.length > 1 && <WalkSplits walk={active} />}

          <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
            <p>Ligue a localização e permita o acesso ao iniciar. O GPS registra o percurso com marcas a cada quilômetro, parciais, ritmo e elevação, tudo sem internet. O círculo indica a precisão do último ponto.</p>
            <p>O tempo ativo pausa sozinho quando o GPS passa 45 segundos sem entregar posição e volta a contar quando o sinal retorna; trechos separados por pausa ou perda de sinal não somam distância entre si. Use Pausar quando descansar.</p>
            <p>A gravação continua quando você troca de aplicativo ou bloqueia a tela, se o navegador mantiver o GPS rodando em segundo plano. Se o sistema interromper o GPS, o cronômetro não conta e o percurso retoma de onde parou ao abrir de novo.</p>
            <p>Antes de sair, entre na sua conta na versão publicada e deixe o aplicativo aberto com internet para preparar as páginas offline. Mantenha a conta conectada para acessar os dados locais sem internet.</p>
            <p>O percurso, os quilômetros e o tempo ativo são salvos continuamente neste aparelho, separados por conta. Ao reabrir uma caminhada interrompida, use Retomar caminhada. O tempo com o aplicativo fechado não é adicionado automaticamente.</p>
            <p>As caminhadas concluídas ficam em uma fila local, com percurso, quilômetros e tempo, separada por conta. As exclusões também ficam registradas. Ao voltar à internet, a fila é enviada para a sua conta e as pendências já resolvidas saem do aparelho.</p>
            <p>Com internet e a conta conectada, o aplicativo envia a fila de caminhadas concluídas e as exclusões, e traz de volta os percursos que já estavam na sua conta em outros aparelhos. O indicador Online mostra apenas a conexão; a confirmação do backup aparece no painel Backup na sua conta. Limpar os dados do site apaga o histórico e a fila local, mas o que já foi enviado continua na conta. Cada caminhada concluída pode ser exportada em GPX.</p>
          </div>
        </section>
        <WalkingHistory />
      </>}
  </div>;
}
