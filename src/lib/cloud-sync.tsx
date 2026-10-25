import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getCloudState, saveCloudState } from "@/lib/sync.functions";
import { useStore, initialState } from "@/lib/store";
import type { AppState } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Status = "offline" | "loading" | "synced" | "saving" | "error";

const META_KEY = "nutriplan.sync.meta";

interface SyncMeta {
  userId: string;
  /** updated_at do último estado que este aparelho baixou/enviou */
  remoteUpdatedAt: string | null;
  /** snapshot enviado pela última vez */
  savedHash: string;
}

function loadMeta(userId: string): SyncMeta | null {
  try {
    const meta = JSON.parse(localStorage.getItem(`${META_KEY}:${userId}`) ?? "null") as SyncMeta | null;
    return meta?.userId === userId ? meta : null;
  } catch {
    return null;
  }
}

function saveMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(`${META_KEY}:${meta.userId}`, JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

let currentStatus: Status = "offline";
const listeners = new Set<(s: Status) => void>();
function setStatus(s: Status) {
  currentStatus = s;
  listeners.forEach((l) => l(s));
}

/** Status da sincronização com a nuvem, para exibir na interface. */
export function useSyncStatus(): Status {
  const [status, setLocal] = useState<Status>(currentStatus);
  useEffect(() => {
    listeners.add(setLocal);
    setLocal(currentStatus);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return status;
}

function hasContent(s: AppState | null): boolean {
  if (!s) return false;
  return Boolean(
    s.onboarded ||
      s.logs?.length ||
      s.weights?.length ||
      s.recipes?.length ||
      s.customFoods?.length ||
      s.plan?.length,
  );
}

function summarize(s: AppState | null) {
  if (!s) return "sem dados";
  const parts = [
    `${s.logs?.length ?? 0} registros`,
    `${s.weights?.length ?? 0} pesagens`,
    `${s.recipes?.length ?? 0} receitas`,
  ];
  return parts.join(" · ");
}

/** Junta os dois lados sem perder informação: une listas por id e mantém o perfil mais recente. */
function mergeStates(local: AppState, remote: AppState): AppState {
  const byId = <T extends { id: string }>(a: T[] = [], b: T[] = []) => {
    const map = new Map<string, T>();
    [...b, ...a].forEach((item) => map.set(item.id, item));
    return [...map.values()];
  };

  const water = new Map<string, { date: string; ml: number }>();
  [...(remote.water ?? []), ...(local.water ?? [])].forEach((w) => {
    const prev = water.get(w.date);
    water.set(w.date, prev && prev.ml > w.ml ? prev : w);
  });

  return {
    ...remote,
    ...local,
    logs: byId(local.logs, remote.logs),
    weights: byId(local.weights, remote.weights),
    measures: byId(local.measures, remote.measures),
    recipes: byId(local.recipes, remote.recipes),
    customFoods: byId(local.customFoods, remote.customFoods),
    plan: byId(local.plan, remote.plan),
    fasts: byId(local.fasts, remote.fasts),
    goals: byId(local.goals, remote.goals),
    shopping: byId(local.shopping, remote.shopping),
    favorites: [...new Set([...(local.favorites ?? []), ...(remote.favorites ?? [])])],
    water: [...water.values()],
    settings: local.settings ?? remote.settings,
  };
}

/**
 * Mantém o estado local e a nuvem em sincronia e, quando os dois lados mudaram
 * desde a última sincronização, pergunta ao usuário o que fazer.
 */
export function CloudSync() {
  // A identidade deve ser a mesma que carregou o estado local deste provider.
  const { state, hydrated, update, accountId: userId } = useStore();

  const loadCloud = useServerFn(getCloudState);
  const saveCloud = useServerFn(saveCloudState);

  const loadedFor = useRef<string | null>(null);
  const lastSaved = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [conflict, setConflict] = useState<{ remote: AppState; local: AppState; updatedAt: string | null } | null>(
    null,
  );

  const applyState = useCallback(
    (next: AppState, updatedAt: string | null, uid: string) => {
      const merged = { ...initialState, ...next };
      update(() => merged);
      const payload = JSON.stringify(merged);
      lastSaved.current = payload;
      saveMeta({ userId: uid, remoteUpdatedAt: updatedAt, savedHash: payload });
    },
    [update],
  );

  const push = useCallback(
    async (next: AppState, uid: string) => {
      const payload = JSON.stringify(next);
      const res = await saveCloud({ data: { state: payload } });
      lastSaved.current = payload;
      saveMeta({ userId: uid, remoteUpdatedAt: res.savedAt ?? null, savedHash: payload });
    },
    [saveCloud],
  );

  // Carga inicial ao entrar na conta
  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      loadedFor.current = null;
      setStatus("offline");
      return;
    }
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    setStatus("loading");

    let cancelled = false;
    (async () => {
      try {
        const res = await loadCloud();
        if (cancelled) return;
        const remote = res.state ? (JSON.parse(res.state) as AppState) : null;
        const local = stateRef.current;
        const meta = loadMeta(userId);
        const knownRemote = meta && meta.userId === userId ? meta.remoteUpdatedAt : null;
        const localChanged = !meta || meta.userId !== userId || meta.savedHash !== JSON.stringify(local);
        const remoteChanged = res.updatedAt !== knownRemote;

        if (!hasContent(remote)) {
          await push(local, userId);
          if (hasContent(local)) toast.success("Seus dados deste aparelho foram salvos na conta");
        } else if (hasContent(local) && localChanged && remoteChanged && knownRemote !== null) {
          // Os dois lados mudaram: o usuário decide.
          setConflict({ remote: remote!, local, updatedAt: res.updatedAt });
          setStatus("error");
          return;
        } else if (localChanged && knownRemote === null && hasContent(local)) {
          // Primeiro login neste aparelho com dados dos dois lados: juntamos tudo.
          const merged = mergeStates(local, remote!);
          applyState(merged, res.updatedAt, userId);
          await push(merged, userId);
          toast.success("Dados do aparelho e da conta foram unidos");
        } else {
          applyState(remote!, res.updatedAt, userId);
          toast.success("Dados da sua conta carregados");
        }
        setStatus("synced");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus("error");
          toast.error("Não foi possível sincronizar agora. Seus dados seguem salvos neste aparelho.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, hydrated, loadCloud, push, applyState]);

  // Salvamento automático com debounce
  useEffect(() => {
    if (!hydrated || !userId || loadedFor.current !== userId) return;
    if (currentStatus === "loading" || conflict) return;
    const payload = JSON.stringify(state);
    if (payload === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setStatus("saving");
        await push(state, userId);
        setStatus("synced");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }, 1200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, userId, push, conflict]);

  const resolve = async (choice: "merge" | "cloud" | "device") => {
    if (!conflict || !userId) return;
    const next =
      choice === "cloud"
        ? conflict.remote
        : choice === "device"
          ? conflict.local
          : mergeStates(conflict.local, conflict.remote);
    setConflict(null);
    setStatus("saving");
    try {
      applyState(next, conflict.updatedAt, userId);
      await push({ ...initialState, ...next }, userId);
      setStatus("synced");
      toast.success("Dados sincronizados");
    } catch {
      setStatus("error");
      toast.error("Não foi possível salvar agora.");
    }
  };

  return (
    <AlertDialog open={Boolean(conflict)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Seus dados mudaram em dois lugares</AlertDialogTitle>
          <AlertDialogDescription>
            Neste aparelho: {summarize(conflict?.local ?? null)}.
            <br />
            Na sua conta: {summarize(conflict?.remote ?? null)}.
            <br />O que você quer manter?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction className="w-full" onClick={() => void resolve("merge")}>
            Juntar tudo (recomendado)
          </AlertDialogAction>
          <AlertDialogAction className="w-full" onClick={() => void resolve("cloud")}>
            Usar os dados da conta
          </AlertDialogAction>
          <AlertDialogCancel className="w-full" onClick={() => void resolve("device")}>
            Usar os dados deste aparelho
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
