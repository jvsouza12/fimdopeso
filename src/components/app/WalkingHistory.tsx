import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Footprints, Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalking } from "@/lib/walking-provider";
import { walkKm, walkTime } from "@/lib/walking";
import { WalkingMap } from "./WalkingMap";

export function WalkingHistory({ compact = false }: { compact?: boolean }) {
  const { walks, online } = useWalking();
  const [selected, setSelected] = useState<string | null>(null);
  const completed = walks.filter(w => w.endedAt);
  return <section className="space-y-4 border-t border-border pt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-semibold"><Footprints className="size-5 text-primary" /> Minhas caminhadas</h2>
      {compact && <Button asChild size="sm" variant="ghost"><Link to="/caminhada">Ver todas</Link></Button>}
    </div>
    {!completed.length ? <p className="text-sm text-muted-foreground">Nenhuma caminhada concluída ainda.</p> :
      <div className="space-y-3">{(compact ? completed.slice(0, 3) : completed).map(walk => <article key={walk.id} className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-medium">{new Date(walk.startedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{walkKm(walk.distanceMeters)} km · {walkTime(walk.durationSeconds)}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{walk.synced ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}{walk.synced ? "Salva na conta" : "Salva no aparelho · sincronização pendente"}</p>
          </div>
          <Button size="sm" variant="outline" aria-expanded={selected === walk.id} onClick={() => setSelected(selected === walk.id ? null : walk.id)}>Percurso <ChevronDown /></Button>
        </div>
        {selected === walk.id && <div className="mt-4"><WalkingMap points={walk.points} online={online} /></div>}
      </article>)}</div>}
  </section>;
}