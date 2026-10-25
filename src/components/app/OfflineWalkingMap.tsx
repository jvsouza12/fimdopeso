import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LocateFixed, Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kilometreMarks, projectWalk, routeSegments } from "@/lib/walking-map";
import type { WalkPoint } from "@/lib/walking";

type Camera = { mode: "fit" | "follow" | "manual"; x: number; y: number; span: number };

export function OfflineWalkingMap({ points, online, live = false, finished = false }: {
  points: WalkPoint[]; online: boolean; live?: boolean; finished?: boolean;
}) {
  const gridId = useId().replace(/:/g, "");
  const model = useMemo(() => projectWalk(points), [points]);
  const segments = useMemo(() => routeSegments(model.points), [model.points]);
  const marks = useMemo(() => kilometreMarks(points), [points]);
  const [camera, setCamera] = useState<Camera>({ mode: "fit", x: 0, y: 0, span: 250 });
  const drag = useRef<{ id: number; x: number; y: number; cx: number; cy: number; span: number } | null>(null);
  useEffect(() => {
    setCamera({ mode: live ? "follow" : "fit", x: 0, y: 0, span: 250 });
  }, [live]);
  const first = model.points[0], last = model.points.at(-1);
  const lastFix = points.at(-1);
  const center = camera.mode === "follow" && last ? last : camera.mode === "manual" ? camera : model.center;
  const span = camera.mode === "fit" ? model.span : camera.span;
  const cx = center.x, cy = center.y;
  const step = 10 ** Math.floor(Math.log10(span / 5));
  const scale = Math.floor(span / 4 / step) * step;
  const dot = span * 0.018;
  const markerStride = Math.max(1, Math.ceil(marks.length / 40));
  const zoom = (factor: number) => setCamera({
    mode: camera.mode === "follow" ? "follow" : "manual",
    x: cx, y: cy, span: Math.max(20, Math.min(200000, span * factor)),
  });

  return <div className="absolute inset-0 bg-surface-2 text-foreground">
    <svg className="h-full w-full touch-none text-primary" viewBox={`${cx - span / 2} ${cy - span / 2} ${span} ${span}`} role="img" aria-label={`Percurso GPS com ${points.length} pontos e ${marks.length} quilômetros completos`}
      onPointerDown={event => {
        if (drag.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cx, cy, span };
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = start.span / Math.max(1, Math.min(rect.width, rect.height));
        setCamera({ mode: "manual", span: start.span,
          x: start.cx - (event.clientX - start.x) * ratio,
          y: start.cy - (event.clientY - start.y) * ratio });
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <defs><pattern id={gridId} width={scale} height={scale} patternUnits="userSpaceOnUse"><path d={`M ${scale} 0 H 0 V ${scale}`} fill="none" className="stroke-border" strokeWidth={span / 700} /></pattern></defs>
      <rect x={cx - span * 3} y={cy - span * 3} width={span * 6} height={span * 6} fill={`url(#${gridId})`} />
      {segments.map((segment, index) => <polyline key={index} points={segment.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={span / 110} strokeLinecap="round" strokeLinejoin="round" />)}
      {last && lastFix && !finished && <circle cx={last.x} cy={last.y} r={lastFix.accuracy} className="fill-primary/10 stroke-primary/40" strokeWidth={span / 600}><title>Precisão do último ponto: {Math.round(lastFix.accuracy)} metros</title></circle>}
      {marks.filter((_, index) => index % markerStride === 0).map(mark => <g key={mark.km}>
        <circle cx={mark.x} cy={mark.y} r={dot * 1.15} className="fill-background stroke-primary" strokeWidth={dot / 5} />
        <text x={mark.x} y={mark.y} textAnchor="middle" dominantBaseline="central" fontSize={dot * 1.2} className="fill-foreground font-bold">{mark.km}</text>
        <title>Quilômetro {mark.km}</title>
      </g>)}
      {first && <g>
        <circle cx={first.x} cy={first.y} r={dot} className="fill-success stroke-background" strokeWidth={dot / 4} />
        <text x={first.x} y={first.y} textAnchor="middle" dominantBaseline="central" fontSize={dot * 1.2} className="fill-background font-bold">I</text><title>Início</title>
      </g>}
      {last && <g>
        <circle cx={last.x} cy={last.y} r={dot} className={finished ? "fill-foreground stroke-background" : "fill-primary stroke-background"} strokeWidth={dot / 4} />
        {finished ? <text x={last.x} y={last.y} textAnchor="middle" dominantBaseline="central" fontSize={dot * 1.2} className="fill-background font-bold">F</text> : <circle cx={last.x} cy={last.y} r={dot / 3} className="fill-primary-foreground" />}
        <title>{finished ? "Chegada" : "Último ponto GPS"}</title>
      </g>}
    </svg>
    <div className="pointer-events-none absolute left-3 top-3 space-y-1">
      <p className="w-fit rounded-md bg-background/95 px-2 py-1 text-xs text-muted-foreground">{online ? "Percurso GPS" : "GPS offline"} · sem ruas</p>
      {camera.mode === "follow" && <p className="w-fit rounded-md bg-background/95 px-2 py-1 text-xs text-primary">Seguindo último ponto GPS</p>}
    </div>
    <span className="absolute right-3 top-3 flex flex-col items-center rounded-md bg-background/95 px-2 py-1 text-xs font-semibold"><span aria-hidden="true">↑</span>N</span>
    <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-background/95 px-2 py-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" />Início</span>
      <span className="flex items-center gap-1"><span className={`size-2 rounded-full ${finished ? "bg-foreground" : "bg-primary"}`} />{finished ? "Chegada" : "Último ponto"}</span>
      <span>Marcas a cada km</span>
      <span className="border-b-2 border-foreground pb-0.5 tabular-nums">{scale >= 1000 ? `${scale / 1000} km` : `${Number(scale.toFixed(1))} m`} / quadrícula</span>
    </div>
    <div className="absolute bottom-3 right-3 flex flex-col gap-1">
      <Button variant="outline" size="icon" aria-label="Ampliar mapa" disabled={span <= 20} onClick={() => zoom(0.5)}><Plus /></Button>
      <Button variant="outline" size="icon" aria-label="Reduzir mapa" disabled={span >= 200000} onClick={() => zoom(2)}><Minus /></Button>
      {!finished && <Button variant={camera.mode === "follow" ? "default" : "outline"} size="icon" aria-label="Seguir último ponto GPS" aria-pressed={camera.mode === "follow"} onClick={() => setCamera({ mode: "follow", x: 0, y: 0, span: 250 })}><LocateFixed /></Button>}
      <Button variant="outline" size="icon" aria-label="Enquadrar percurso completo" onClick={() => setCamera({ mode: "fit", x: 0, y: 0, span: 250 })}><Maximize /></Button>
    </div>
  </div>;
}
