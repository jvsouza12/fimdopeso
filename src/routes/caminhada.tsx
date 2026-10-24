import { createFileRoute, Link } from "@tanstack/react-router";
import { Footprints, Play, Pause, Square, LocateFixed, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useWalking } from "@/lib/walking-provider";
import { walkKm, walkTime } from "@/lib/walking";
import { WalkingMap } from "@/components/app/WalkingMap";
import { WalkingHistory } from "@/components/app/WalkingHistory";
import { toast } from "sonner";

export const Route = createFileRoute("/caminhada")({
  head: () => ({ meta: [
    { title: "Caminhada e percursos — NutriPlan" },
    { name: "description", content: "Acompanhe distância, tempo e seus percursos de caminhada com histórico privado na sua conta." },
    { property: "og:title", content: "Caminhada e percursos — NutriPlan" },
    { property: "og:description", content: "Seu tempo, quilômetros e histórico de caminhadas em um só lugar." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: WalkingPage,
});

function WalkingPage() {
  const { session, loading } = useSession();
  const { active, running, elapsed, ready, online, gps, error, syncing, start, pause, finish, retry } = useWalking();
  return <div className="space-y-6">
    <PageHeader title="Caminhada" subtitle="Um passo de cada vez." action={<span className="flex items-center gap-1.5 text-xs text-muted-foreground">{online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}{online ? "Online" : "Sem internet"}</span>} />
    {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !session ?
      <section className="space-y-4 py-10 text-center"><Footprints className="mx-auto size-10 text-primary" /><h2 className="text-xl font-semibold">Sua caminhada, na sua conta</h2><Button asChild><Link to="/auth">Entrar para caminhar</Link></Button></section> : <>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><LocateFixed className="size-4 text-primary" />{gps}</span>{active && <span className="text-xs text-muted-foreground">{running ? "Em andamento" : "Pronta para retomar"}</span>}</div>
          <div className="grid grid-cols-2 divide-x divide-border py-3 text-center">
            <div><p className="text-4xl font-bold tabular-nums sm:text-5xl">{walkKm(active?.distanceMeters ?? 0)}</p><p className="mt-2 text-xs text-muted-foreground">Quilômetros</p></div>
            <div><p className="text-2xl font-semibold tabular-nums sm:text-4xl">{walkTime(active ? elapsed : 0)}</p><p className="mt-2 text-xs text-muted-foreground">Tempo em movimento</p></div>
          </div>
          <WalkingMap points={active?.points ?? []} online={online} />
          <div className="flex gap-3">
            <Button className="h-12 flex-1" disabled={!ready} onClick={running ? pause : start}>{running ? <Pause /> : <Play />}{running ? "Pausar" : active ? "Retomar caminhada" : "Iniciar caminhada"}</Button>
            {active && <Button className="h-12" variant="outline" onClick={() => { void finish().then(() => toast.success("Caminhada salva")).catch(() => toast.error("Não foi possível salvar. Tente novamente.")); }}><Square />Finalizar</Button>}
          </div>
          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm text-warning"><p className="min-w-0 flex-1">{error}</p><Button size="sm" variant="ghost" onClick={retry} disabled={!online || syncing} aria-label="Tentar sincronizar"><RefreshCw /></Button></div>}
          <p className="text-xs leading-relaxed text-muted-foreground">A localização é usada apenas durante a caminhada. Mantenha o app aberto e a tela ligada: ao sair ou bloquear a tela, a gravação é pausada. Sem internet, os pontos e o percurso aparecem no mapa GPS e ficam salvos neste aparelho; as ruas do Google Maps precisam de conexão. Os registros são enviados à conta quando a conexão voltar.</p>
        </section>
        <WalkingHistory />
      </>}
  </div>;
}