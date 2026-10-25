import { getDistance } from "geolib";

export interface WalkPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  segment: number;
  /** Metros acima do nível do mar, quando o aparelho informa. */
  altitude?: number | null;
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

/** Pontos piores que isto (metros) são descartados. */
export const MAX_ACCURACY = 50;
/** Intervalo sem posição aceita (ms) que dispara a pausa automática. */
export const SIGNAL_GAP = 45000;

export function acceptPoint(points: WalkPoint[], point: WalkPoint): boolean {
  if (!Number.isFinite(point.timestamp) || point.timestamp <= 0 ||
      !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.accuracy) || point.accuracy < 0 || point.accuracy > MAX_ACCURACY) return false;
  if (point.altitude != null && (!Number.isFinite(point.altitude) || Math.abs(point.altitude) > 10000)) return false;
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

export interface WalkSplit { km: number; meters: number; seconds: number; partial: boolean }

/** Parciais por quilômetro; usa o mesmo cálculo de distância do registro. */
export function walkSplits(walk: Walk): WalkSplit[] {
  const points = walk.points;
  const splits: WalkSplit[] = [];
  let distance = 0;
  let seconds = 0;
  let boundary = 1000;
  let splitStart = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.segment !== to.segment) continue;
    const meters = getDistance(from, to, 0.1);
    const delta = (to.timestamp - from.timestamp) / 1000;
    if (!(meters > 0) || !(delta > 0) || delta > SIGNAL_GAP / 1000) continue;
    while (boundary <= distance + meters) {
      const fraction = (boundary - distance) / meters;
      const at = seconds + delta * fraction;
      splits.push({ km: boundary / 1000, meters: 1000, seconds: Math.round(at - splitStart), partial: false });
      splitStart = at;
      boundary += 1000;
    }
    distance += meters;
    seconds += delta;
  }
  const remaining = distance - (boundary - 1000);
  const remainingSeconds = seconds - splitStart;
  if (remaining >= 10 && remainingSeconds > 0) {
    splits.push({ km: boundary / 1000, meters: Math.round(remaining), seconds: Math.round(remainingSeconds), partial: true });
  }
  return splits;
}

/** Subida acumulada em metros, ignorando oscilações do altímetro. */
export function walkElevationGain(points: WalkPoint[]) {
  let gain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.segment !== to.segment) continue;
    if (from.altitude == null || to.altitude == null) continue;
    const delta = to.altitude - from.altitude;
    if (delta > 1) gain += delta;
  }
  return Math.round(gain);
}

/** Ritmo do último minuto de registro; devolve traço quando o sinal está perdido. */
export function walkLivePace(points: WalkPoint[]) {
  const last = points.at(-1);
  if (!last || points.length < 2) return "—";
  if (Date.now() - last.timestamp > SIGNAL_GAP) return "—";
  let meters = 0;
  let seconds = 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const from = points[index - 1];
    const to = points[index];
    if (last.timestamp - to.timestamp > 60000) break;
    if (from.segment !== to.segment) break;
    const delta = (to.timestamp - from.timestamp) / 1000;
    const length = getDistance(from, to, 0.1);
    if (!(length > 0) || !(delta > 0) || delta > SIGNAL_GAP / 1000) break;
    meters += length;
    seconds += delta;
  }
  return walkPace(meters, seconds);
}

const XML_ESCAPE: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" };

/** Arquivo GPX do percurso; abre no Strava, Garmin e afins. */
export function walkGpx(walk: Walk) {
  const segments: WalkPoint[][] = [];
  walk.points.forEach(point => {
    const last = segments.at(-1);
    if (!last || last.at(-1)?.segment !== point.segment) segments.push([point]);
    else last.push(point);
  });
  const track = segments.map(segment => `<trkseg>${segment.map(point =>
    `<trkpt lat="${point.latitude.toFixed(6)}" lon="${point.longitude.toFixed(6)}">` +
    (point.altitude != null ? `<ele>${point.altitude.toFixed(1)}</ele>` : "") +
    `<time>${new Date(point.timestamp).toISOString()}</time>` +
    `</trkpt>`).join("")}</trkseg>`).join("");
  const name = `CasalPlan ${new Date(walk.startedAt).toLocaleDateString("pt-BR")}`
    .replace(/[<>&'"]/g, character => XML_ESCAPE[character] ?? "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="CasalPlan" xmlns="http://www.topografix.com/GPX/1/1">` +
    `<metadata><name>${name}</name><time>${new Date(walk.startedAt).toISOString()}</time></metadata>` +
    `<trk><name>${name}</name><type>walking</type>${track}</trk></gpx>`;
}
