import { openDB } from "idb";
import type { Walk } from "./walking";

interface PendingWalkChange {
  walkId: string;
  operation: "upsert" | "delete";
  revision: string;
}

async function database() {
  return openDB("nutriplan-walks", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("accounts")) db.createObjectStore("accounts");
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox");
    },
  });
}

function pendingChange(walkId: string, operation: PendingWalkChange["operation"]): PendingWalkChange {
  return { walkId, operation, revision: crypto.randomUUID() };
}

/** Recupera também a fila de registros antigos, sem marcar nada como enviado. */
export async function readWalks(userId: string): Promise<Walk[]> {
  const db = await database();
  try {
    const tx = db.transaction(["accounts", "outbox"], "readwrite");
    const accounts = tx.objectStore("accounts");
    const outbox = tx.objectStore("outbox");
    const saved: Walk[] = (await accounts.get(userId)) ?? [];
    const pending: PendingWalkChange[] = (await outbox.get(userId)) ?? [];
    const queue = new Map(pending.map(change => [change.walkId, change]));
    const walks = saved.filter(walk => walk.userId === userId);
    for (const walk of walks) {
      if (walk.endedAt && !walk.synced && !queue.has(walk.id)) {
        queue.set(walk.id, pendingChange(walk.id, "upsert"));
      }
    }
    await outbox.put([...queue.values()], userId);
    await tx.done;
    return walks;
  } finally {
    db.close();
  }
}

/** Histórico e fila são gravados juntos: uma exclusão nunca perde sua pendência. */
export async function writeWalks(userId: string, walks: Walk[]) {
  if (!userId || walks.some(walk => walk.userId !== userId)) {
    throw new Error("A caminhada não pertence à conta atual.");
  }
  const db = await database();
  try {
    const tx = db.transaction(["accounts", "outbox"], "readwrite");
    const accounts = tx.objectStore("accounts");
    const outbox = tx.objectStore("outbox");
    const previous: Walk[] = (await accounts.get(userId)) ?? [];
    const pending: PendingWalkChange[] = (await outbox.get(userId)) ?? [];
    const queue = new Map(pending.map(change => [change.walkId, change]));
    const before = new Map(previous.filter(walk => walk.userId === userId).map(walk => [walk.id, walk]));
    const remaining = new Set(walks.map(walk => walk.id));

    for (const walk of before.values()) {
      if (!remaining.has(walk.id)) {
        queue.set(walk.id, pendingChange(walk.id, "delete"));
      }
    }
    for (const walk of walks) {
      // A sessão ativa fica no histórico local; só entra na fila quando concluída.
      if (!walk.endedAt || walk.synced) continue;
      const existing = queue.get(walk.id);
      if (!existing || existing.operation !== "upsert" || JSON.stringify(before.get(walk.id)) !== JSON.stringify(walk)) {
        queue.set(walk.id, pendingChange(walk.id, "upsert"));
      }
    }

    // O conteúdo a enviar permanece em accounts, sem duplicar os pontos GPS.
    // A fila não é removida por reconexão: exige confirmação futura da nuvem.
    await accounts.put(walks, userId);
    await outbox.put([...queue.values()], userId);
    await tx.done;
  } finally {
    db.close();
  }
}
