import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { acceptPoint, appendPoint, type Walk, type WalkPoint } from "./walking";
import { readWalks, writeWalks } from "./walking-storage";

interface WalkingContext {
  walks: Walk[]; active: Walk | undefined; running: boolean; elapsed: number;
   ready: boolean; online: boolean; gps: string; error: string; syncing: boolean; locating: boolean;
  start: () => void; pause: () => void; finish: () => Promise<void>; retry: () => void;
}
const Context = createContext<WalkingContext | null>(null);

export function WalkingProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [walks, setWalks] = useState<Walk[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [locating, setLocating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const [gps, setGps] = useState("GPS desligado");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const list = useRef<Walk[]>([]);
  const uid = useRef<string | null>(null);
  const watch = useRef<number | null>(null);
  const since = useRef<number | null>(null);
  const segment = useRef(0);
  const loaded = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const wake = useRef<WakeLockSentinel | null>(null);

  function commit(next: Walk[]) {
    const account = uid.current;
    if (!account) return;
    list.current = next;
    setWalks(next);
    writes.current = writes.current.catch(() => {}).then(() => writeWalks(account, next));
    void writes.current.catch(() => setError("Não foi possível salvar no aparelho. Libere espaço antes de continuar."));
  }

  function stopWatch() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setLocating(false);
    void wake.current?.release().catch(() => {});
    wake.current = null;
  }

  function pause() {
    stopWatch();
    segment.current += 1;
    const startTime = since.current;
    since.current = null;
    setRunning(false);
    setGps("Pausado");
    if (startTime !== null) {
      const seconds = Math.max(0, (Date.now() - startTime) / 1000);
      commit(list.current.map(w => w.endedAt ? w : { ...w, durationSeconds: w.durationSeconds + seconds }));
    }
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

  useEffect(() => {
    let cancelled = false;
    pause();
    uid.current = userId;
    loaded.current = false;
    list.current = [];
    setWalks([]);
    setOwner(null);
    setError("");
    if (userId) void readWalks(userId).then(saved => {
      if (cancelled) return;
      list.current = saved;
      setWalks(saved);
      setOwner(userId);
      loaded.current = true;
      setGps(saved.some(w => !w.endedAt) ? "Pausado · caminhada recuperada" : "GPS desligado");
    }).catch(() => setError("Armazenamento indisponível. Permita o armazenamento neste navegador."));
    return () => { cancelled = true; pause(); };
  }, [userId]);

  useEffect(() => {
    const connection = () => { setOnline(navigator.onLine); };
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const tick = setInterval(() => {
      if (since.current !== null) {
        const now = Date.now();
        const seconds = Math.max(0, (now - since.current) / 1000);
        since.current = now;
        commit(list.current.map(w => w.endedAt ? w : { ...w, durationSeconds: w.durationSeconds + seconds }));
      }
      const current = list.current.find(w => !w.endedAt);
      setElapsed((current?.durationSeconds ?? 0) + (since.current === null ? 0 : (Date.now() - since.current) / 1000));
    }, 1000);
    const hide = () => { if (document.hidden) pause(); };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", connection); window.removeEventListener("offline", connection);
      window.removeEventListener("pagehide", pause); document.removeEventListener("visibilitychange", hide);
      stopWatch();
    };
  }, []);

  function start() {
    if (!userId || owner !== userId || watch.current !== null) return;
    if (!("geolocation" in navigator)) { setError("Este navegador não oferece localização."); return; }
    setError("");
    const current = list.current.find(w => !w.endedAt);
    if (!current) commit([{
      id: crypto.randomUUID(), userId, startedAt: new Date().toISOString(), endedAt: null,
      durationSeconds: 0, distanceMeters: 0, points: [], synced: false,
    }, ...list.current]);
    segment.current = Math.max(0, ...(current?.points.map(p => p.segment) ?? [])) + 1;
    let thisSegment = segment.current;
    let lastSignal: number | null = null;
    const account = userId;
    setLocating(true);
    setGps("Buscando sinal do GPS…");
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {});
    watch.current = navigator.geolocation.watchPosition(position => {
      if (uid.current !== account || segment.current !== thisSegment) return;
      const point: WalkPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp, segment: thisSegment };
      if (!acceptPoint([], point) || Date.now() - point.timestamp > 30000 || point.timestamp - Date.now() > 5000) {
        setGps("Sinal fraco · aguardando posição precisa");
        return;
      }
      if (lastSignal !== null && point.timestamp <= lastSignal) return;
      if (lastSignal !== null && point.timestamp - lastSignal > 30000) {
        segment.current += 1;
        thisSegment = segment.current;
        point.segment = thisSegment;
      }
      lastSignal = point.timestamp;
      if (since.current === null) {
        since.current = Date.now(); setRunning(true); setLocating(false);
        if ("wakeLock" in navigator) void navigator.wakeLock.request("screen").then(lock => {
          if (uid.current !== account || since.current === null || document.hidden) {
            void lock.release().catch(() => {});
          } else { wake.current = lock; }
        }).catch(() => {});
      }
      setGps(`GPS ativo · precisão ±${Math.round(position.coords.accuracy)} m`);
      commit(list.current.map(w => w.endedAt ? w : appendPoint(w, point)));
    }, failure => {
      if (uid.current !== account || segment.current !== thisSegment) return;
      if (failure.code === 1) {
        pause();
        setError("Localização bloqueada. Ligue a localização do celular e permita o acesso à localização deste app no navegador.");
      } else {
        const hasStarted = since.current !== null;
        setGps(hasStarted
          ? "Sem sinal GPS · tempo continua, distância aguardando"
          : "Buscando GPS · ligue a localização e aguarde em local aberto");
      }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }

  async function finish() {
    pause();
    setError("");
    commit(list.current.map(w => w.endedAt ? w : { ...w, endedAt: new Date().toISOString(), durationSeconds: Math.round(w.durationSeconds) }));
    await writes.current;
  }
  const visible = owner === userId && userId ? walks : [];
  return <Context.Provider value={{ walks: visible, active: visible.find(w => !w.endedAt), running,
    elapsed, ready: Boolean(userId && owner === userId), online, gps, error, syncing, locating,
    start, pause, finish, retry: () => void sync() }}>{children}</Context.Provider>;
}

export function useWalking() {
  const value = useContext(Context);
  if (!value) throw new Error("WalkingProvider ausente");
  return value;
}