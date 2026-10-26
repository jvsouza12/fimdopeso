import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/useSession";
import { acceptPoint, appendPoint, SIGNAL_GAP, type Walk, type WalkPoint } from "./walking";
import { dropFromOutbox, readWalkOutbox, readWalks, writeWalks } from "./walking-storage";
import { listWalks, removeWalk, uploadWalk, type WalkPointPayload, type WalkRow } from "./walks.functions";

type CloudStatus = "idle" | "sending" | "done" | "error";

interface WalkingContext {
  walks: Walk[]; active: Walk | undefined; running: boolean; autoPaused: boolean; elapsed: number;
  ready: boolean; online: boolean; gps: string; error: string; syncing: boolean; locating: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error"; savedAt: number | null;
  cloudStatus: CloudStatus; cloudPending: number; cloudMessage: string;
  start: () => void; pause: () => void; finish: () => Promise<void>; retry: () => void;
  remove: (id: string) => Promise<void>; syncCloud: () => void;
}
const Context = createContext<WalkingContext | null>(null);

/** Reconstrói o percurso recebido da conta ignorando pontos inválidos. */
function restorePoints(points: WalkPointPayload[] | null | undefined): WalkPoint[] {
  if (!Array.isArray(points)) return [];
  const restored: WalkPoint[] = [];
  for (const point of points) {
    if (!point) continue;
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || !Number.isFinite(point.timestamp)) continue;
    restored.push({
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: Number.isFinite(point.accuracy) ? point.accuracy : 50,
      timestamp: point.timestamp,
      segment: Number.isFinite(point.segment) ? point.segment : 0,
      altitude: typeof point.altitude === "number" && Number.isFinite(point.altitude) ? point.altitude : null,
    });
  }
  return restored;
}

function toWalk(row: WalkRow, userId: string): Walk {
  const duration = Number(row.duration_seconds);
  const distance = Number(row.distance_meters);
  return {
    id: row.id,
    userId,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? row.started_at,
    durationSeconds: Number.isFinite(duration) ? duration : 0,
    distanceMeters: Number.isFinite(distance) ? distance : 0,
    points: restorePoints(row.points),
    synced: true,
  };
}

export function WalkingProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const uploadWalkFn = useServerFn(uploadWalk);
  const removeWalkFn = useServerFn(removeWalk);
  const listWalksFn = useServerFn(listWalks);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const [gps, setGps] = useState("GPS desligado");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<WalkingContext["saveStatus"]>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("idle");
  const [cloudPending, setCloudPending] = useState(0);
  const [cloudMessage, setCloudMessage] = useState("");
  const cloudBusy = useRef(false);
  const saveRevision = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const list = useRef<Walk[]>([]);
  const uid = useRef<string | null>(null);
  const watch = useRef<number | null>(null);
  const token = useRef(0);
  const since = useRef<number | null>(null);
  // Um GPS válido também pode informar a mesma posição enquanto a pessoa está parada.
  const lastSignal = useRef<number | null>(null);
  const segment = useRef(0);
  const loaded = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const wake = useRef<WakeLockSentinel | null>(null);

  function commit(next: Walk[]) {
    const account = uid.current;
    if (!account) return;
    const revision = ++saveRevision.current;
    list.current = next;
    setWalks(next);
    setSaveStatus("saving");
    writes.current = writes.current.catch(() => {}).then(() => writeWalks(account, next));
    void writes.current.then(() => {
      if (uid.current !== account || saveRevision.current !== revision) return;
      setSavedAt(Date.now());
      setSaveStatus("saved");
    }, () => {
      if (uid.current !== account || saveRevision.current !== revision) return;
      setSaveStatus("error");
      setError("Não foi possível salvar no aparelho. Libere espaço antes de continuar.");
    });
  }

  function releaseWake() {
    void wake.current?.release().catch(() => {});
    wake.current = null;
  }

  function requestWake() {
    if (!("wakeLock" in navigator) || document.hidden || since.current === null) return;
    if (wake.current && !wake.current.released) return;
    void navigator.wakeLock.request("screen").then(lock => {
      if (document.hidden || since.current === null) {
        void lock.release().catch(() => {});
        return;
      }
      wake.current = lock;
    }).catch(() => {});
  }

  function stopWatch() {
    token.current += 1;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setLocating(false);
    releaseWake();
  }

  /** Salva apenas o intervalo coberto pelo GPS, inclusive com timers suspensos. */
  function flush() {
    if (since.current === null) return;
    const now = Date.now();
    const signalEnd = lastSignal.current === null ? since.current : lastSignal.current + SIGNAL_GAP;
    const seconds = Math.max(0, (Math.min(now, signalEnd) - since.current) / 1000);
    since.current = now;
    if (seconds > 0) {
      commit(list.current.map(w => w.endedAt ? w : {
        ...w, durationSeconds: w.durationSeconds + seconds, synced: false,
      }));
    }
  }

  function pause() {
    flush();
    stopWatch();
    segment.current += 1;
    since.current = null;
    lastSignal.current = null;
    setRunning(false);
    setAutoPaused(false);
    setGps("Pausado");
    setElapsed(list.current.find(w => !w.endedAt)?.durationSeconds ?? 0);
  }

  async function sync() {
    const account = uid.current;
    if (!account || !loaded.current) return;
    setSyncing(true);
    try {
      commit(list.current);
      await writes.current;
      if (uid.current === account) setError("");
    } catch {
      if (uid.current === account) setError("Não foi possível salvar no aparelho. Libere espaço e tente novamente antes de fechar o app.");
    } finally {
      if (uid.current === account) setSyncing(false);
    }
  }

  /**
   * Envia a fila local para a conta e traz de volta o que já está na nuvem.
   * Sem internet, nada é perdido: a fila continua salva no aparelho.
   */
  async function syncCloudNow() {
    const account = uid.current;
    if (!account || !loaded.current || cloudBusy.current) return;
    if (!navigator.onLine) {
      if (uid.current === account) {
        setCloudStatus("idle");
        setCloudMessage("Sem internet. As caminhadas ficam na fila deste aparelho e são enviadas quando a conexão voltar.");
      }
      return;
    }
    cloudBusy.current = true;
    setCloudStatus("sending");
    try {
      await writes.current.catch(() => {});
      const queue = await readWalkOutbox(account);
      let remaining = queue.length;
      setCloudPending(remaining);
      let failures = 0;
      const sent: string[] = [];

      for (const entry of queue) {
        if (uid.current !== account) return;
        try {
          if (entry.operation === "save") {
            await uploadWalkFn({ data: {
              id: entry.walk.id,
              startedAt: entry.walk.startedAt,
              endedAt: entry.walk.endedAt ?? new Date().toISOString(),
              durationSeconds: Math.round(entry.walk.durationSeconds),
              distanceMeters: entry.walk.distanceMeters,
              points: entry.walk.points,
            } });
            sent.push(entry.walkId);
          } else {
            await removeWalkFn({ data: { walkId: entry.walkId } });
          }
          await dropFromOutbox(account, entry.walkId);
          remaining = Math.max(0, remaining - 1);
          setCloudPending(remaining);
        } catch {
          failures += 1;
        }
      }

      if (uid.current !== account) return;
      if (sent.length) {
        commit(list.current.map(walk => sent.includes(walk.id) ? { ...walk, synced: true } : walk));
        await writes.current.catch(() => {});
      }

      // Junta as caminhadas que já estão na conta, sem duplicar e sem
      // ressuscitar o que foi apagado neste aparelho e ainda está pendente.
      try {
        const remote = await listWalksFn();
        if (uid.current !== account) return;
        const pending = await readWalkOutbox(account);
        const blocked = new Set(pending.filter(item => item.operation === "delete").map(item => item.walkId));
        const known = new Set(list.current.map(walk => walk.id));
        const incoming = remote.walks
          .filter(row => Boolean(row.ended_at) && !known.has(row.id) && !blocked.has(row.id))
          .map(row => toWalk(row, account));
        if (incoming.length) {
          commit([...list.current, ...incoming].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
          await writes.current.catch(() => {});
        }
      } catch {
        failures += 1;
      }

      if (uid.current !== account) return;
      if (failures) {
        setCloudStatus("error");
        setCloudMessage("Não foi possível enviar tudo agora. A fila continua salva neste aparelho e será reenviada na próxima conexão.");
      } else {
        setCloudStatus("done");
        setCloudMessage(queue.length ? "Caminhadas enviadas para a sua conta." : "Tudo salvo na sua conta.");
      }
    } catch {
      if (uid.current === account) {
        setCloudStatus("error");
        setCloudMessage("Não foi possível enviar agora. A fila continua salva neste aparelho.");
      }
    } finally {
      cloudBusy.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    pause();
    saveRevision.current += 1;
    setSaveStatus("idle");
    setSavedAt(null);
    setCloudStatus("idle");
    setCloudPending(0);
    setCloudMessage("");
    uid.current = userId;
    loaded.current = false;
    list.current = [];
    setWalks([]);
    setOwner(null);
    setElapsed(0);
    setAutoPaused(false);
    setSyncing(false);
    setGps("GPS desligado");
    setError("");
    if (userId) void writes.current.catch(() => {}).then(() => readWalks(userId)).then(saved => {
      if (cancelled || uid.current !== userId) return;
      list.current = saved;
      setWalks(saved);
      setOwner(userId);
      loaded.current = true;
      setElapsed(saved.find(w => !w.endedAt)?.durationSeconds ?? 0);
      setGps(saved.some(w => !w.endedAt) ? "Pausado · caminhada recuperada" : "GPS desligado");
      // Inclui também os registros anteriores na fila local, sem marcar envio à nuvem.
      void sync();
      void syncCloudNow();
    }).catch(() => {
      if (!cancelled && uid.current === userId) setError("Armazenamento indisponível. Permita o armazenamento neste navegador.");
    });
    return () => { cancelled = true; pause(); };
  }, [userId, loadAttempt]);

  useEffect(() => {
    const connection = () => {
      setOnline(navigator.onLine);
      // Retenta a persistência local e, com internet, envia a fila para a conta.
      if (navigator.onLine) {
        void sync();
        void syncCloudNow();
      }
    };
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const tick = setInterval(() => {
      const fresh = lastSignal.current !== null && Date.now() - lastSignal.current < SIGNAL_GAP;
      setAutoPaused(since.current !== null && !fresh);
      flush();
      setElapsed(list.current.find(w => !w.endedAt)?.durationSeconds ?? 0);
    }, 1000);
    const visibility = () => {
      if (document.hidden) { flush(); return; }
      if (since.current === null) return;
      requestWake();
      if (watch.current === null) attach();
    };
    const leaving = () => { flush(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leaving);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", connection); window.removeEventListener("offline", connection);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", leaving);
      stopWatch();
    };
  }, []);

  /** Abre (ou reabre) a escuta do GPS em um novo trecho. */
  function attach() {
    const account = uid.current;
    if (!account || !("geolocation" in navigator)) return;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    token.current += 1;
    const mine = token.current;
    segment.current += 1;
    setLocating(true);
    setGps("Buscando sinal do GPS…");
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
    watch.current = navigator.geolocation.watchPosition(position => {
      if (uid.current !== account || token.current !== mine) return;
      const altitude = typeof position.coords.altitude === "number" && Number.isFinite(position.coords.altitude)
        ? position.coords.altitude : null;
      const point: WalkPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp, segment: segment.current, altitude };
      if (!acceptPoint([], point) || Date.now() - point.timestamp > 30000 || point.timestamp - Date.now() > 5000) {
        setGps("Sinal fraco · aguardando posição precisa");
        return;
      }
      const previous = list.current.find(w => !w.endedAt)?.points.at(-1);
      if (lastSignal.current !== null && point.timestamp <= lastSignal.current) return;
      if (previous && previous.segment === point.segment && point.timestamp <= previous.timestamp) return;
      // Fecha o intervalo anterior antes de atualizar o sinal: o retorno do GPS
      // nunca deve transformar um período sem localização em tempo ativo.
      flush();
      lastSignal.current = point.timestamp;
      if (previous && point.timestamp - previous.timestamp > SIGNAL_GAP) {
        segment.current += 1;
        point.segment = segment.current;
      }
      if (since.current === null) {
        since.current = Date.now();
        setRunning(true);
        requestWake();
      }
      setLocating(false);
      setAutoPaused(false);
      setGps(`GPS ativo · precisão ±${Math.round(position.coords.accuracy)} m`);
      commit(list.current.map(w => w.endedAt ? w : appendPoint(w, point)));
    }, failure => {
      if (uid.current !== account || token.current !== mine) return;
      if (failure.code === 1) {
        pause();
        setError("Localização bloqueada. Ligue a localização do celular e permita o acesso à localização deste app no navegador.");
      } else {
        setGps(since.current !== null
          ? "Sem sinal GPS · pausa automática até o sinal voltar"
          : "Buscando GPS · ligue a localização e aguarde em local aberto");
      }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  function start() {
    if (!userId || owner !== userId || watch.current !== null || document.hidden) return;
    if (!window.isSecureContext) { setError("Abra o aplicativo por uma conexão HTTPS para permitir o GPS."); return; }
    if (!("geolocation" in navigator)) { setError("Este navegador não oferece localização."); return; }
    setError("");
    const current = list.current.find(w => !w.endedAt);
    if (!current) commit([{
      id: crypto.randomUUID(), userId, startedAt: new Date().toISOString(), endedAt: null,
      durationSeconds: 0, distanceMeters: 0, points: [], synced: false,
    }, ...list.current]);
    else segment.current = current.points.reduce((max, point) => Math.max(max, point.segment), segment.current);
    attach();
  }

  async function finish() {
    pause();
    setError("");
    commit(list.current.map(w => w.endedAt ? w : { ...w, endedAt: new Date().toISOString(), durationSeconds: Math.round(w.durationSeconds) }));
    await writes.current;
    void syncCloudNow();
  }

  async function remove(id: string) {
    if (!uid.current) return;
    commit(list.current.filter(w => w.id !== id));
    await writes.current;
    setElapsed(list.current.find(w => !w.endedAt)?.durationSeconds ?? 0);
    void syncCloudNow();
  }

  const visible = owner === userId && userId ? walks : [];
  return <Context.Provider value={{ walks: visible, active: visible.find(w => !w.endedAt), running, autoPaused,
    elapsed, ready: Boolean(userId && owner === userId), online, gps, error, syncing, locating,
    saveStatus, savedAt, cloudStatus, cloudPending, cloudMessage,
    start, pause, finish, remove, syncCloud: () => { void syncCloudNow(); }, retry: () => {
      if (!userId || uid.current !== userId) return;
      if (!loaded.current) {
        setError("");
        setLoadAttempt(attempt => attempt + 1);
        return;
      }
      void sync();
      void syncCloudNow();
    } }}>{children}</Context.Provider>;
}

export function useWalking() {
  const value = useContext(Context);
  if (!value) throw new Error("WalkingProvider ausente");
  return value;
}
