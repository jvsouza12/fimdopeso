import { getDistance } from "geolib";

export interface WalkPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  segment: number;
}

export interface Walk {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  distanceMeters: number;
  points: WalkPoint[];
  synced: boolean;
}

export function acceptPoint(points: WalkPoint[], point: WalkPoint): boolean {
  if (!Number.isFinite(point.timestamp) || point.timestamp <= 0 ||
      !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.accuracy) || point.accuracy < 0 || point.accuracy > 50) return false;
  const last = points.at(-1);
  if (!last) return true;
  if (point.timestamp <= last.timestamp) return false;
  if (last.segment !== point.segment) return true;
  const meters = getDistance(last, point, 0.1);
  const seconds = (point.timestamp - last.timestamp) / 1000;
  return meters >= Math.max(5, Math.min(last.accuracy, point.accuracy) / 2) && meters / seconds <= 4;
}

export function appendPoint(walk: Walk, point: WalkPoint): Walk {
  if (!acceptPoint(walk.points, point)) return walk;
  const last = walk.points.at(-1);
  const extra = last && last.segment === point.segment ? getDistance(last, point, 0.1) : 0;
  return { ...walk, distanceMeters: walk.distanceMeters + extra, points: [...walk.points, point] };
}

export function walkTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function walkKm(meters: number) {
  return (meters / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function walkPace(meters: number, seconds: number) {
  if (!Number.isFinite(meters) || !Number.isFinite(seconds) || meters < 20 || seconds <= 0) return "—";
  const pace = Math.round(seconds / (meters / 1000));
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}`;
}