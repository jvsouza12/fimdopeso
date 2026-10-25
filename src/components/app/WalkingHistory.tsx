import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Footprints, Cloud, CloudOff, Download, Mountain, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalking } from "@/lib/walking-provider";
import { walkElevationGain, walkGpx, walkKm, walkPace, walkTime, type Walk } from "@/lib/walking";
import { WalkingMap } from "./WalkingMap";
import { WalkSplits } from "./WalkSplits";
import { toast } from "sonner";

export function WalkingHistory({ compact = false }: { compact?: boolean }) {
  const { walks, online, remove } = useWalking();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const completed = walks.filter(w => w.endedAt);

  function download(walk: Walk) {
    try {
      const url = URL.createObjectURL(new Blob([walkGpx(walk)], { type: "application/gpx+xml" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `casalplan-caminhada-${walk.startedAt.slice(0, 10)}.gpx`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Não foi possível gerar o arquivo do percurso.");
    }
  }

  function erase(walk: Walk) {
    if (confirming !== walk.id) { setConfirming(walk.id); return; }
    setConfirming(null);
    if (selected === walk.id) setSelected(null);
    void remove(walk.id)
      .then(() => toast.success("Caminhada apagada"))
      .catch(() => toast.error("Não foi possível apagar. Tente novamente."));
  }

  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-semibold"><Footprints className="size-5 text-primary" /> Minhas caminhadas</h2>
      {compact && <Button asChild size="sm" variant="ghost"><Link to="/caminhada">Ver todas</Link></Button>}
    </div>
    {!completed.length ? <p className="text-sm text-muted-foreground">Nenhuma caminhada concluída ainda.</p> :
      <div className="space-y-3">{(compact ? completed.slice(0, 3) : completed).map(walk => {
        const climb = walkElevationGain(walk.points);
        return <article key={walk.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{new Date(walk.startedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-1 text-sm text-muted-foreground">{walkKm(walk.distanceMeters)} km · {walkTime(walk.durationSeconds)} · {walkPace(walk.distanceMeters, walk.durationSeconds)} /km</p>
              {climb > 0 && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Mountain className="size-3.5" />{climb} m de subida</p>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{walk.synced ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}{walk.synced ? "Salva na conta e neste aparelho" : "Salva neste aparelho · disponível offline"}</p>
            </div>
            <Button size="sm" variant="outline" aria-expanded={selected === walk.id} onClick={() => setSelected(selected === walk.id ? null : walk.id)}>Percurso <ChevronDown /></Button>
          </div>
          {selected === walk.id && <div className="mt-4 space-y-4">
            <WalkingMap points={walk.points} online={online} finished />
            <WalkSplits walk={walk} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => download(walk)}><Download />Baixar GPX</Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => erase(walk)}><Trash2 />{confirming === walk.id ? "Confirmar exclusão" : "Excluir"}</Button>
            </div>
          </div>}
        </article>;
      })}</div>}
  </section>;
}
