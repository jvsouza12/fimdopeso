import { useEffect, useRef, useState } from "react";
import { MapPin, WifiOff } from "lucide-react";
import type { WalkPoint } from "@/lib/walking";
import { OfflineWalkingMap } from "./OfflineWalkingMap";

declare global { interface Window { nutriplanMapReady?: () => void } }
let loading: Promise<void> | undefined;
function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    if (!key) { reject(new Error("Mapas não configurados")); return; }
    window.nutriplanMapReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=nutriplanMapReady&channel=${channel}`;
    script.async = true;
    script.onerror = () => { script.remove(); loading = undefined; reject(new Error("Mapa indisponível")); };
    document.head.appendChild(script);
  });
  return loading;
}

export function WalkingMap({ points, online }: { points: WalkPoint[]; online: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const lines = useRef<google.maps.Polyline[]>([]);
  const markers = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!online || !points.length) return;
    let cancelled = false;
    setFailed(false);
    const timeout = window.setTimeout(() => { if (!cancelled) setFailed(true); }, 10000);
    void loadMaps().then(() => {
      window.clearTimeout(timeout);
      const first = points[0];
      if (cancelled || !element.current || !first) return;
      if (!map.current) map.current = new google.maps.Map(element.current, {
        center: { lat: first.latitude, lng: first.longitude }, zoom: 16,
        clickableIcons: false, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, gestureHandling: "cooperative",
      });
      setFailed(false);
      setReady(true);
    }).catch(() => { window.clearTimeout(timeout); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [online, points.length > 0]);
  useEffect(() => {
    if (!ready || !map.current) return;
    lines.current.forEach(line => line.setMap(null));
    markers.current.forEach(marker => marker.setMap(null));
    const groups = new Map<number, WalkPoint[]>();
    points.forEach(p => groups.set(p.segment, [...(groups.get(p.segment) ?? []), p]));
    const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    lines.current = [...groups.values()].map(group => new google.maps.Polyline({
      path: group.map(p => ({ lat: p.latitude, lng: p.longitude })),
      strokeColor: color, strokeOpacity: 1, strokeWeight: 5, map: map.current,
    }));
    const first = points[0], last = points.at(-1);
    markers.current = first && last ? [
      new google.maps.Marker({ map: map.current, position: { lat: first.latitude, lng: first.longitude }, label: "A", title: "Início" }),
      new google.maps.Marker({ map: map.current, position: { lat: last.latitude, lng: last.longitude }, label: "B", title: "Última posição" }),
    ] : [];
    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.current.fitBounds(bounds, 40);
    }
    return () => { lines.current.forEach(line => line.setMap(null)); markers.current.forEach(marker => marker.setMap(null)); };
  }, [points, ready]);
  const message = !online ? "Seu percurso começa aqui · GPS offline" : "Seu percurso começa aqui";
  return <div className="relative h-56 w-full overflow-hidden rounded-lg border border-border bg-surface-2 sm:h-96" aria-label="Mapa do percurso">
    <div ref={element} className={`absolute inset-0 ${!online || !ready || failed || !points.length ? "invisible" : ""}`} />
    {points.length > 0 && (!online || !ready || failed) && <OfflineWalkingMap points={points} online={online} />}
    {!points.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 px-6 text-center">
      {!online ? <WifiOff className="size-8 text-muted-foreground" /> : <MapPin className="size-8 text-primary" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>}
  </div>;
}