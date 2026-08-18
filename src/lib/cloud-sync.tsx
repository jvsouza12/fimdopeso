import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getCloudState, saveCloudState } from "@/lib/sync.functions";
import { useStore, initialState } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import type { AppState } from "@/lib/types";

type Status = "offline" | "loading" | "synced" | "saving" | "error";

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

/**
 * Mantém o estado local e a nuvem em sincronia:
 * - ao entrar, baixa os dados da conta (ou envia os dados locais na primeira vez);
 * - depois, salva automaticamente cada alteração (com atraso curto).
 */
export function CloudSync() {
  const { state, hydrated, update } = useStore();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const loadCloud = useServerFn(getCloudState);
  const saveCloud = useServerFn(saveCloudState);

  const loadedFor = useRef<string | null>(null);
  const lastSaved = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        if (hasContent(remote)) {
          update(() => ({ ...initialState, ...(remote as AppState) }));
          lastSaved.current = JSON.stringify({ ...initialState, ...(remote as AppState) });
          toast.success("Dados da sua conta carregados");
        } else {
          const payload = JSON.stringify(state);
          await saveCloud({ data: { state: payload } });
          lastSaved.current = payload;
          if (hasContent(state)) toast.success("Seus dados deste aparelho foram salvos na conta");
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
  }, [userId, hydrated, loadCloud, saveCloud, update, state]);

  // Salvamento automático com debounce
  useEffect(() => {
    if (!hydrated || !userId || loadedFor.current !== userId) return;
    if (currentStatus === "loading") return;
    const payload = JSON.stringify(state);
    if (payload === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setStatus("saving");
        await saveCloud({ data: { state: payload } });
        lastSaved.current = payload;
        setStatus("synced");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }, 1200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, userId, saveCloud]);

  return null;
}
