import { useId, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectWalk, routeSegments } from "@/lib/walking-map";
import type { WalkPoint } from "@/lib/walking";

export function OfflineWalkingMap({ points, online }: { points: WalkPoint[]; online: boolean }) {
  const gridId = useId().replace(/:/g, "");
  const model = useMemo(() => projectWalk(points), [points]);
  const segments = useMemo(() => routeSegments(model.points), [model.points]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  const span = model.span / zoom;
  const cx = model.center.x + offset.x, cy = model.center.y + offset.y;
  const first = model.points[0], last = model.points.at(-1);
  const step = 10 ** Math.floor(Math.log10(span / 5));
  const scale = Math.floor(span / 4 / step) * step;
  const dot = span * 0.014;
  return <div className="absolute inset-0 bg-surface-2">
    <svg className="h-full w-full touch-none text-primary" viewBox={`${cx - span / 2} ${cy - span / 2} ${span} ${span}`} role="img" aria-label={`Percurso GPS salvo, ${points.length} pontos, início e última posição`}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, offset }; }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = span / Math.min(rect.width, rect.height);
        setOffset({ x: start.offset.x - (event.clientX - start.x) * ratio, y: start.offset.y - (event.clientY - start.y) * ratio });
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <defs><pattern id={gridId} width={scale} height={scale} patternUnits="userSpaceOnUse"><path d={`M ${scale} 0 H 0 V ${scale}`} fill="none" className="stroke-border" strokeWidth={span / 700} /></pattern></defs>
      <rect x={cx - span} y={cy - span} width={span * 2} height={span * 2} fill={`url(#${gridId})`} />
      {segments.map((segment, index) => <polyline key={index} points={segment.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={span / 100} strokeLinecap="round" strokeLinejoin="round" />)}
      {model.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={span / 250} className="fill-primary stroke-surface" strokeWidth={span / 1000} />)}
      {first && <g><circle cx={first.x} cy={first.y} r={dot} className="fill-success stroke-surface" strokeWidth={dot / 3} /><title>Início</title></g>}
      {last && <g><circle cx={last.x} cy={last.y} r={dot} className="fill-primary stroke-surface" strokeWidth={dot / 3} /><circle cx={last.x} cy={last.y} r={dot / 3} className="fill-primary-foreground" /><title>Última posição</title></g>}
    </svg>
    <span className="absolute left-3 top-3 rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">{online ? "Percurso GPS" : "Mapa offline"} · sem ruas</span>
    <span className="absolute right-3 top-3 flex flex-col items-center rounded-md bg-surface px-2 py-1 text-xs font-semibold text-foreground"><span aria-hidden="true">↑</span>N</span>
    <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" />Início</span>
      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />Última posição</span>
      <span>{points.length} pontos</span>
      <span className="border-b-2 border-foreground pb-0.5 tabular-nums">{scale >= 1000 ? `${scale / 1000} km` : `${scale} m`} / quadrícula</span>
    </div>
    <div className="absolute bottom-3 right-3 flex flex-col gap-1">
      <Button variant="outline" size="icon" aria-label="Ampliar mapa" title="Ampliar mapa" disabled={zoom >= 16} onClick={() => setZoom(z => Math.min(16, z * 2))}><Plus /></Button>
      <Button variant="outline" size="icon" aria-label="Reduzir mapa" title="Reduzir mapa" disabled={zoom <= 0.25} onClick={() => setZoom(z => Math.max(0.25, z / 2))}><Minus /></Button>
      <Button variant="outline" size="icon" aria-label="Enquadrar percurso" title="Enquadrar percurso" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}><LocateFixed /></Button>
    </div>
  </div>;
}