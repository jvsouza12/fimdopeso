import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { appendPoint, type Walk, type WalkPoint } from "./walking";
import { readWalks, writeWalks } from "./walking-storage";
import type { Json } from "@/integrations/supabase/types";

interface WalkingContext {
  walks: Walk[]; active: Walk | undefined; running: boolean; elapsed: number;
  ready: boolean; online: boolean; gps: string; error: string; syncing: boolean;
  start: () => void; pause: () => void; finish: () => Promise<void>; retry: () => void;
}
const Context = createContext<WalkingContext | null>(null);

export function WalkingProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [walks, setWalks] = useState<Walk[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
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
  const busy = useRef(false);
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
    if (!account || !loaded.current || !navigator.onLine || busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      await writes.current;
      for (const walk of list.current.filter(w => w.endedAt && !w.synced)) {
        const { error: saveError } = await supabase.from("walks").upsert({
          id: walk.id, user_id: account, started_at: walk.startedAt,
          ended_at: walk.endedAt ?? walk.startedAt,
          duration_seconds: Math.round(walk.durationSeconds), distance_meters: walk.distanceMeters,
          points: walk.points as unknown as Json,
        }, { onConflict: "id", ignoreDuplicates: true });
        if (saveError) throw saveError;
        if (uid.current !== account) return;
        commit(list.current.map(w => w.id === walk.id ? { ...w, synced: true } : w));
      }
      const { data, error: readError } = await supabase.from("walks").select("*").eq("user_id", account).order("started_at", { ascending: false });
      if (readError) throw readError;
      if (uid.current !== account) return;
      const merged = new Map(list.current.map(w => [w.id, w]));
      for (const row of data ?? []) merged.set(row.id, {
        id: row.id, userId: account, startedAt: row.started_at, endedAt: row.ended_at,
        durationSeconds: row.duration_seconds, distanceMeters: row.distance_meters,
        points: row.points as unknown as WalkPoint[], synced: true,
      });
      commit([...merged.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      setError("");
    } catch {
      if (uid.current === account) setError("A sincronização está pendente. Suas caminhadas permanecem neste aparelho.");
    } finally { busy.current = false; setSyncing(false); }
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
      void sync();
    }).catch(() => setError("Armazenamento indisponível. Permita o armazenamento neste navegador."));
    return () => { cancelled = true; pause(); };
  }, [userId]);

  useEffect(() => {
    const connection = () => { setOnline(navigator.onLine); if (navigator.onLine) void sync(); };
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
    const retry = setInterval(() => { if (list.current.some(w => w.endedAt && !w.synced)) void sync(); }, 30000);
    const hide = () => { if (document.hidden) pause(); };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(tick); clearInterval(retry);
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
    const thisSegment = segment.current;
    const account = userId;
    setGps("Buscando localização…");
    watch.current = navigator.geolocation.watchPosition(position => {
      if (uid.current !== account || segment.current !== thisSegment) return;
      if (position.coords.accuracy > 50) { setGps("Sinal fraco · buscando GPS"); return; }
      if (since.current === null) {
        since.current = Date.now(); setRunning(true);
        if ("wakeLock" in navigator) void navigator.wakeLock.request("screen").then(lock => { wake.current = lock; }).catch(() => {});
      }
      setGps(`GPS ativo · precisão ${Math.round(position.coords.accuracy)} m`);
      const point: WalkPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp, segment: thisSegment };
      commit(list.current.map(w => w.endedAt ? w : appendPoint(w, point)));
    }, failure => {
      pause();
      setError(failure.code === 1 ? "Localização bloqueada. Permita o acesso nas configurações do navegador para caminhar."
        : "Não foi possível obter sua localização. Vá para uma área aberta e tente retomar.");
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }

  async function finish() {
    pause();
    commit(list.current.map(w => w.endedAt ? w : { ...w, endedAt: new Date().toISOString(), durationSeconds: Math.round(w.durationSeconds) }));
    await writes.current;
    void sync();
  }
  const visible = owner === userId && userId ? walks : [];
  return <Context.Provider value={{ walks: visible, active: visible.find(w => !w.endedAt), running,
    elapsed, ready: Boolean(userId && owner === userId), online, gps, error, syncing,
    start, pause, finish, retry: () => void sync() }}>{children}</Context.Provider>;
}

export function useWalking() {
  const value = useContext(Context);
  if (!value) throw new Error("WalkingProvider ausente");
  return value;
}