import { openDB } from "idb";
import type { Walk } from "./walking";

export type WalkOutboxEntry =
  | { walkId: string; operation: "save"; walk: Walk }
  | { walkId: string; operation: "delete" };

async function database() {
  return openDB("nutriplan-walks", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("accounts")) db.createObjectStore("accounts");
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox");
    },
  });
}

export async function readWalks(userId: string): Promise<Walk[]> {
  const db = await database();
  try {
    const saved: Walk[] = (await db.get("accounts", userId)) ?? [];
    return saved.filter(walk => walk.userId === userId);
  } finally {
    db.close();
  }
}

/** A fila é privada da conta e não entra no estado compartilhado de nutrição. */
export async function readWalkOutbox(userId: string): Promise<WalkOutboxEntry[]> {
  const db = await database();
  try {
    return (await db.get("outbox", userId)) ?? [];
  } finally {
    db.close();
  }
}

/** Histórico e pendências são gravados juntos: ambos persistem ou nenhum muda. */
export async function writeWalks(userId: string, walks: Walk[]) {
  if (!userId || walks.some(walk => walk.userId !== userId)) {
    throw new Error("A caminhada não pertence à conta atual.");
  }
  const db = await database();
  try {
    const transaction = db.transaction(["accounts", "outbox"], "readwrite");
    const accounts = transaction.objectStore("accounts");
    const outbox = transaction.objectStore("outbox");
    const previous: Walk[] = (await accounts.get(userId)) ?? [];
    const pending: WalkOutboxEntry[] = (await outbox.get(userId)) ?? [];
    const entries = new Map(pending.map(entry => [entry.walkId, entry]));
    const currentIds = new Set(walks.map(walk => walk.id));

    // Somente caminhadas concluídas entram na fila de envio. A sessão ativa
    // continua sendo salva integralmente no histórico local a cada atualização.
    for (const walk of walks) {
      if (walk.endedAt && !walk.synced) {
        entries.set(walk.id, { walkId: walk.id, operation: "save", walk });
      }
    }

    // Preserva exclusões mesmo após fechar o app, para não restaurá-las
    // indevidamente quando existir um serviço de sincronização conectado.
    for (const walk of previous) {
      if (walk.userId !== userId || currentIds.has(walk.id)) continue;
      if (walk.endedAt || walk.synced) {
        entries.set(walk.id, { walkId: walk.id, operation: "delete" });
      } else {
        entries.delete(walk.id);
      }
    }

    await accounts.put(walks, userId);
    await outbox.put([...entries.values()], userId);
    await transaction.done;
  } finally {
    db.close();
  }
}
