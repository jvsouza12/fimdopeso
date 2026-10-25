import { createFileRoute, Link } from "@tanstack/react-router";
import { Footprints, Play, Pause, Square, LocateFixed, Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useWalking } from "@/lib/walking-provider";
import { walkKm, walkPace, walkTime } from "@/lib/walking";
import { WalkingMap } from "@/components/app/WalkingMap";
import { WalkingHistory } from "@/components/app/WalkingHistory";
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
  const { active, running, locating, elapsed, ready, online, gps, error, syncing, start, pause, finish, retry } = useWalking();
  return <div className="space-y-6">
    <PageHeader title="Caminhada" subtitle="Um passo de cada vez." action={<span className="flex items-center gap-1.5 text-xs text-muted-foreground">{online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}{online ? "Online" : "Sem internet"}</span>} />
    {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !session ?
      <section className="space-y-4 py-10 text-center"><Footprints className="mx-auto size-10 text-primary" /><h2 className="text-xl font-semibold">Sua caminhada, na sua conta</h2><Button asChild><Link to="/auth">Entrar para caminhar</Link></Button></section> : <>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><LocateFixed className="size-4 text-primary" />{gps}</span>{active && <span className="text-xs text-muted-foreground">{running ? "Em andamento" : "Pronta para retomar"}</span>}</div>
          <div className="grid grid-cols-2 gap-y-5 rounded-xl border border-border bg-surface py-5 text-center sm:grid-cols-3">
            <div><p className="text-4xl font-bold tabular-nums text-primary">{walkKm(active?.distanceMeters ?? 0)}</p><p className="mt-2 text-xs text-muted-foreground">Quilômetros</p></div>
            <div className="border-l border-border"><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{walkTime(active ? elapsed : 0)}</p><p className="mt-2 text-xs text-muted-foreground">Tempo ativo</p></div>
            <div className="col-span-2 border-t border-border pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pt-0"><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{walkPace(active?.distanceMeters ?? 0, active ? elapsed : 0)}</p><p className="mt-2 text-xs text-muted-foreground">Ritmo médio · min/km</p></div>
          </div>
          <WalkingMap points={active?.points ?? []} online={online} live={running} />
          <div className="flex gap-3">
            <Button className="h-12 flex-1" disabled={!ready} onClick={running || locating ? pause : start}>{locating ? <Loader2 className="animate-spin" /> : running ? <Pause /> : <Play />}{locating ? "Cancelar busca do GPS" : running ? "Pausar" : active ? "Retomar caminhada" : "Iniciar caminhada"}</Button>
            {active && <Button className="h-12" variant="outline" onClick={() => { void finish().then(() => toast.success("Caminhada salva")).catch(() => toast.error("Não foi possível salvar. Tente novamente.")); }}><Square />Finalizar</Button>}
          </div>
          {!ready && !error && <p role="status" className="text-sm text-muted-foreground">Carregando caminhadas deste aparelho…</p>}
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-warning"><p className="min-w-0 flex-1">{error}</p><Button size="sm" variant="ghost" onClick={retry} disabled={syncing} aria-label={ready ? "Tentar salvar no aparelho" : "Tentar carregar caminhadas"}><RefreshCw />Tentar novamente</Button></div>}
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
            <p>Ligue a localização e permita o acesso ao iniciar. O GPS registra o percurso sem internet, com marcas a cada quilômetro. O círculo indica a precisão do último ponto. Arraste para explorar e use o botão de localização para voltar a acompanhar.</p>
            <p>O tempo ativo inclui paradas enquanto a gravação estiver ligada; use Pausar quando descansar. Trechos separados por pausa ou perda prolongada de sinal não somam distância entre si.</p>
            <p>Antes de sair, entre na sua conta e carregue esta página na versão publicada com internet. Após a primeira abertura, recarregue ainda conectado para preparar o acesso offline. As caminhadas ficam neste navegador, separadas por conta; limpar os dados do site apaga o histórico local.</p>
            <p>O mapa não exibe ruas. O app tenta manter a tela ligada quando o celular permite. Ao bloquear a tela ou trocar de aplicativo, a gravação pausa: retome ao voltar.</p>
          </div>
        </section>
        <WalkingHistory />
      </>}
  </div>;
}