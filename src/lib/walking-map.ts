import type { WalkPoint } from "./walking";

const EARTH_RADIUS = 6378137;
export interface MapPoint { x: number; y: number; segment: number }

/** Local geographic coordinates in metres; no tiles, network or account state. */
export function projectWalk(points: WalkPoint[]) {
  const first = points[0];
  if (!first) return { points: [] as MapPoint[], center: { x: 0, y: 0 }, span: 200 };
  const radians = Math.PI / 180;
  const cosLat = Math.cos(Math.min(85, Math.max(-85, first.latitude)) * radians);
  const projected = points.map(point => {
    const longitudeDelta = ((point.longitude - first.longitude + 540) % 360) - 180;
    return {
      x: EARTH_RADIUS * longitudeDelta * radians * cosLat,
      y: -EARTH_RADIUS * (point.latitude - first.latitude) * radians,
      segment: point.segment,
    };
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  projected.forEach(({ x, y }) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  return { points: projected, center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, span: Math.max(100, maxX - minX, maxY - minY) * 1.35 };
}

export function routeSegments(points: MapPoint[]) {
  const segments: MapPoint[][] = [];
  points.forEach(point => {
    const last = segments.at(-1);
    if (!last || last.at(-1)?.segment !== point.segment) segments.push([point]);
    else last.push(point);
  });
  return segments;
}