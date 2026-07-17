import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb"

import {
  workbookDraftKey,
  workbookDraftRecordSchema,
  type WorkbookDraftRecord,
  type WorkbookDraftStatus,
} from "./draft-schema"

const DATABASE_NAME = "bay-buddy-workbook-drafts"
const DATABASE_VERSION = 1
const STORE_NAME = "drafts"
const CHANNEL_NAME = "bay-buddy:workbook-drafts"
const STORAGE_SIGNAL_KEY = "bay-buddy:workbook-drafts:signal"
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_MAX_RECORDS_PER_USER = 50

interface WorkbookDraftDatabase extends DBSchema {
  drafts: {
    key: string
    value: WorkbookDraftRecord
    indexes: {
      byUser: string
      byUserUpdatedAt: [string, string]
    }
  }
}

export type WorkbookDraftSummary = {
  sessionId: string
  status: Exclude<WorkbookDraftStatus, "error"> | "dirty"
  updatedAt: string
  dirtyCount: number
}

export type WorkbookDraftSignal = {
  type: "updated" | "cleared" | "saved"
  userId: string
  sessionId: string
  updatedAt: string
  senderId: string
}

let databasePromise: Promise<IDBPDatabase<WorkbookDraftDatabase>> | null = null

function database(): Promise<IDBPDatabase<WorkbookDraftDatabase>> {
  databasePromise ??= openDB<WorkbookDraftDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "key" })
      store.createIndex("byUser", "userId")
      store.createIndex("byUserUpdatedAt", ["userId", "updatedAt"])
    },
  })
  return databasePromise
}

async function readValidatedDraft(
  key: string,
  raw: unknown,
): Promise<WorkbookDraftRecord | null> {
  const parsed = workbookDraftRecordSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  const db = await database()
  await db.delete(STORE_NAME, key)
  return null
}

export async function getWorkbookDraft(
  userId: string,
  sessionId: string,
): Promise<WorkbookDraftRecord | null> {
  const key = workbookDraftKey(userId, sessionId)
  const db = await database()
  const raw = await db.get(STORE_NAME, key)
  if (!raw) return null
  const draft = await readValidatedDraft(key, raw)
  if (!draft || draft.userId !== userId || draft.sessionId !== sessionId) {
    if (draft) await db.delete(STORE_NAME, key)
    return null
  }
  return draft
}

export async function putWorkbookDraft(draft: WorkbookDraftRecord): Promise<void> {
  const validated = workbookDraftRecordSchema.parse(draft)
  if (validated.key !== workbookDraftKey(validated.userId, validated.sessionId)) {
    throw new Error("Workbook draft namespace does not match its identity.")
  }
  const db = await database()
  await db.put(STORE_NAME, validated)
}

export async function deleteWorkbookDraft(
  userId: string,
  sessionId: string,
): Promise<void> {
  const db = await database()
  await db.delete(STORE_NAME, workbookDraftKey(userId, sessionId))
}

export async function listWorkbookDraftsForUser(
  userId: string,
): Promise<WorkbookDraftRecord[]> {
  const db = await database()
  const rawDrafts = await db.getAllFromIndex(STORE_NAME, "byUser", userId)
  const drafts = (
    await Promise.all(rawDrafts.map((raw) => readValidatedDraft(raw.key, raw)))
  ).filter((draft): draft is WorkbookDraftRecord => draft !== null)
  return drafts
    .filter((draft) => draft.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function listWorkbookDraftSummaries(
  userId: string,
): Promise<Record<string, WorkbookDraftSummary>> {
  const drafts = await listWorkbookDraftsForUser(userId)
  return Object.fromEntries(drafts.map((draft) => [
    draft.sessionId,
    {
      sessionId: draft.sessionId,
      status: draft.status === "error" ? "dirty" : draft.status,
      updatedAt: draft.updatedAt,
      dirtyCount: draft.cells.length,
    },
  ]))
}

export async function clearWorkbookDraftsForUser(userId: string): Promise<number> {
  const db = await database()
  const keys = await db.getAllKeysFromIndex(STORE_NAME, "byUser", userId)
  const transaction = db.transaction(STORE_NAME, "readwrite")
  await Promise.all([
    ...keys.map((key) => transaction.store.delete(key)),
    transaction.done,
  ])
  return keys.length
}

export async function cleanupWorkbookDrafts({
  userId,
  now = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  maxRecords = DEFAULT_MAX_RECORDS_PER_USER,
  existingSessionIds,
}: {
  userId: string
  now?: number
  maxAgeMs?: number
  maxRecords?: number
  existingSessionIds?: ReadonlySet<string>
}): Promise<number> {
  const drafts = await listWorkbookDraftsForUser(userId)
  const staleBefore = now - maxAgeMs
  const removals = new Set<string>()
  for (const draft of drafts) {
    const updatedAt = Date.parse(draft.updatedAt)
    if (!Number.isFinite(updatedAt) || updatedAt < staleBefore) {
      removals.add(draft.sessionId)
    }
    if (existingSessionIds && !existingSessionIds.has(draft.sessionId)) {
      removals.add(draft.sessionId)
    }
  }
  drafts
    .filter((draft) => !removals.has(draft.sessionId))
    .slice(Math.max(0, maxRecords))
    .forEach((draft) => removals.add(draft.sessionId))
  await Promise.all(
    Array.from(removals, (sessionId) => deleteWorkbookDraft(userId, sessionId)),
  )
  return removals.size
}

export function publishWorkbookDraftSignal(
  signal: Omit<WorkbookDraftSignal, "updatedAt"> & { updatedAt?: string },
): void {
  const payload: WorkbookDraftSignal = {
    ...signal,
    updatedAt: signal.updatedAt ?? new Date().toISOString(),
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(payload)
    channel.close()
    return
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_SIGNAL_KEY, JSON.stringify(payload))
    window.localStorage.removeItem(STORAGE_SIGNAL_KEY)
  }
}

export function subscribeWorkbookDraftSignals(
  listener: (signal: WorkbookDraftSignal) => void,
): () => void {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.addEventListener("message", (event: MessageEvent<unknown>) => {
      const signal = event.data as Partial<WorkbookDraftSignal>
      if (
        signal &&
        (signal.type === "updated" || signal.type === "cleared" || signal.type === "saved") &&
        typeof signal.userId === "string" &&
        typeof signal.sessionId === "string" &&
        typeof signal.updatedAt === "string" &&
        typeof signal.senderId === "string"
      ) {
        listener(signal as WorkbookDraftSignal)
      }
    })
    return () => channel.close()
  }
  if (typeof window === "undefined") return () => undefined
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_SIGNAL_KEY || !event.newValue) return
    try {
      listener(JSON.parse(event.newValue) as WorkbookDraftSignal)
    } catch {
      return
    }
  }
  window.addEventListener("storage", onStorage)
  return () => window.removeEventListener("storage", onStorage)
}

export async function resetWorkbookDraftDatabaseForTests(): Promise<void> {
  const current = databasePromise ? await databasePromise : null
  current?.close()
  databasePromise = null
  await deleteDB(DATABASE_NAME)
}
