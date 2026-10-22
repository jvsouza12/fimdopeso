import { openDB } from "idb";
import type { Walk } from "./walking";

async function database() {
  return openDB("nutriplan-walks", 1, {
    upgrade(db) { db.createObjectStore("accounts"); },
  });
}

export async function readWalks(userId: string): Promise<Walk[]> {
  const db = await database();
  return (await db.get("accounts", userId)) ?? [];
}

export async function writeWalks(userId: string, walks: Walk[]) {
  const db = await database();
  await db.put("accounts", walks, userId);
}