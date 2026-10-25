import { MapPin, WifiOff } from "lucide-react";
import type { WalkPoint } from "@/lib/walking";
import { OfflineWalkingMap } from "./OfflineWalkingMap";

export function WalkingMap({ points, online, live = false, finished = false }: {
  points: WalkPoint[]; online: boolean; live?: boolean; finished?: boolean;
}) {
  return <div className="relative h-80 w-full overflow-hidden rounded-xl border border-border bg-surface-2 text-foreground sm:h-[28rem]" aria-label="Mapa do percurso">
    {points.length > 0 ? <OfflineWalkingMap points={points} online={online} live={live} finished={finished} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      {online ? <MapPin className="size-9 text-primary" /> : <WifiOff className="size-9 text-primary" />}
      <p className="text-sm font-medium">{finished ? "Esta caminhada não tem pontos GPS" : "Seu percurso começa aqui"}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{finished ? "O tempo registrado permanece no histórico." : "Inicie a caminhada e aguarde o GPS. O traçado e as marcações por quilômetro funcionam sem internet, sem mapa de ruas."}</p>
    </div>}
  </div>;
}
