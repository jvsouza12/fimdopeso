import { MapPin, WifiOff } from "lucide-react";
import type { WalkPoint } from "@/lib/walking";
import { OfflineWalkingMap } from "./OfflineWalkingMap";

export function WalkingMap({ points, online }: { points: WalkPoint[]; online: boolean }) {
  const message = !online ? "Seu percurso começa aqui · GPS offline" : "Seu percurso começa aqui";
  return <div className="relative h-56 w-full overflow-hidden rounded-lg border border-border bg-surface-2 sm:h-96" aria-label="Mapa do percurso">
    {points.length > 0 && <OfflineWalkingMap points={points} online={online} />}
    {!points.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
      {!online ? <WifiOff className="size-8 text-muted-foreground" /> : <MapPin className="size-8 text-primary" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>}
  </div>;
}