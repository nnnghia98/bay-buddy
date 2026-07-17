import { z } from "zod"

import type {
  WorkbookCellValue,
  WorkbookSaveRequest,
} from "@/schemas/workbook"

export const WORKBOOK_DRAFT_SCHEMA_VERSION = 1
export const WORKBOOK_DRAFT_MAX_CELLS = 500

const workbookDraftValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const workbookDraftCellSchema = z.object({
  rowNumber: z.number().int().positive(),
  columnId: z.string().min(1).max(64),
  originalValue: workbookDraftValueSchema,
  localInput: z.string().max(32_767),
  localValue: workbookDraftValueSchema.optional(),
  conflict: z.object({
    serverValue: workbookDraftValueSchema,
    resolution: z.enum(["unresolved", "keep-local"]),
  }).optional(),
})

export const workbookPendingSaveSchema = z.object({
  requestId: z.uuid(),
  payload: z.object({
    request_id: z.uuid(),
    base_version: z.number().int().positive(),
    changes: z.array(z.object({
      row_number: z.number().int().positive(),
      values: z.record(z.string().min(1).max(255), workbookDraftValueSchema),
    })).min(1).max(500),
  }),
  createdAt: z.iso.datetime(),
  retryable: z.boolean(),
  lastErrorCode: z.string().max(100).optional(),
})

export const workbookDraftRecordSchema = z.object({
  key: z.string().min(1),
  schemaVersion: z.literal(WORKBOOK_DRAFT_SCHEMA_VERSION),
  userId: z.uuid(),
  sessionId: z.uuid(),
  workbookId: z.uuid(),
  originalFilename: z.string().min(1).max(255),
  sheetName: z.string().min(1).max(255),
  serverBaseVersion: z.number().int().positive(),
  cells: z.array(workbookDraftCellSchema).max(WORKBOOK_DRAFT_MAX_CELLS),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  status: z.enum(["dirty", "saving", "conflict", "error"]),
  pendingSave: workbookPendingSaveSchema.optional(),
})

export type WorkbookDraftCell = z.infer<typeof workbookDraftCellSchema>
export type WorkbookPendingSave = z.infer<typeof workbookPendingSaveSchema>
export type WorkbookDraftRecord = z.infer<typeof workbookDraftRecordSchema>
export type WorkbookDraftStatus = WorkbookDraftRecord["status"]
export type WorkbookDraftMap = Map<number, Partial<Record<string, string>>>

export type WorkbookDraftIdentity = {
  userId: string
  sessionId: string
  workbookId: string
  originalFilename: string
  sheetName: string
}

export type WorkbookDraftCellUpdate = {
  rowNumber: number
  columnId: string
  originalValue: WorkbookCellValue
  localInput: string
  localValue?: WorkbookCellValue
  matchesOriginal: boolean
}

export type WorkbookCellServerValue = {
  rowNumber: number
  columnId: string
  value: WorkbookCellValue
}

export type WorkbookDraftHydration =
  | { kind: "empty" }
  | { kind: "matching"; draft: WorkbookDraftRecord }
  | { kind: "stale"; draft: WorkbookDraftRecord }
  | { kind: "future"; draft: WorkbookDraftRecord }

export function workbookDraftKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`
}

export function createWorkbookDraft(
  identity: WorkbookDraftIdentity,
  serverBaseVersion: number,
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  return workbookDraftRecordSchema.parse({
    key: workbookDraftKey(identity.userId, identity.sessionId),
    schemaVersion: WORKBOOK_DRAFT_SCHEMA_VERSION,
    ...identity,
    serverBaseVersion,
    cells: [],
    createdAt: now,
    updatedAt: now,
    status: "dirty",
  })
}

export function classifyWorkbookDraftHydration(
  draft: WorkbookDraftRecord | null,
  currentVersion: number,
): WorkbookDraftHydration {
  if (!draft) return { kind: "empty" }
  if (draft.serverBaseVersion === currentVersion) {
    return { kind: "matching", draft }
  }
  if (draft.serverBaseVersion < currentVersion) {
    return { kind: "stale", draft }
  }
  return { kind: "future", draft }
}

export function updateWorkbookDraftCell(
  current: WorkbookDraftRecord | null,
  identity: WorkbookDraftIdentity,
  serverBaseVersion: number,
  update: WorkbookDraftCellUpdate,
  now = new Date().toISOString(),
): WorkbookDraftRecord | null {
  const draft = current ?? createWorkbookDraft(identity, serverBaseVersion, now)
  const cells = draft.cells.filter(
    (cell) => !(cell.rowNumber === update.rowNumber && cell.columnId === update.columnId),
  )
  if (!update.matchesOriginal) {
    cells.push({
      rowNumber: update.rowNumber,
      columnId: update.columnId,
      originalValue: update.originalValue,
      localInput: update.localInput,
      ...(update.localValue !== undefined ? { localValue: update.localValue } : {}),
    })
  }
  if (cells.length === 0) return null
  return workbookDraftRecordSchema.parse({
    ...draft,
    serverBaseVersion,
    cells,
    updatedAt: now,
    status: "dirty",
    pendingSave: draft.pendingSave
      ? { ...draft.pendingSave, retryable: false }
      : undefined,
  })
}

export function workbookDraftToMap(draft: WorkbookDraftRecord | null): WorkbookDraftMap {
  const map: WorkbookDraftMap = new Map()
  for (const cell of draft?.cells ?? []) {
    const row = { ...(map.get(cell.rowNumber) ?? {}) }
    row[cell.columnId] = cell.localInput
    map.set(cell.rowNumber, row)
  }
  return map
}

export function workbookDraftDirtyCount(draft: WorkbookDraftRecord | null): number {
  return draft?.cells.length ?? 0
}

export function workbookDraftHasUnresolvedConflicts(
  draft: WorkbookDraftRecord | null,
): boolean {
  return Boolean(
    draft?.cells.some((cell) => cell.conflict?.resolution === "unresolved"),
  )
}

export function withPendingWorkbookSave(
  draft: WorkbookDraftRecord,
  payload: WorkbookSaveRequest,
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  return workbookDraftRecordSchema.parse({
    ...draft,
    status: "saving",
    updatedAt: now,
    pendingSave: {
      requestId: payload.request_id,
      payload,
      createdAt: now,
      retryable: true,
    },
  })
}

export function withWorkbookSaveError(
  draft: WorkbookDraftRecord,
  code: string,
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  return workbookDraftRecordSchema.parse({
    ...draft,
    status: code === "VERSION_CONFLICT" ? "conflict" : "error",
    updatedAt: now,
    pendingSave: draft.pendingSave
      ? {
          ...draft.pendingSave,
          retryable: code !== "VERSION_CONFLICT",
          lastErrorCode: code,
        }
      : undefined,
  })
}

export function reconcileWorkbookDraft(
  draft: WorkbookDraftRecord,
  currentVersion: number,
  serverCells: WorkbookCellServerValue[],
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  const serverValues = new Map(
    serverCells.map((cell) => [`${cell.rowNumber}:${cell.columnId}`, cell.value]),
  )
  let hasConflicts = false
  const cells = draft.cells.map((cell) => {
    const key = `${cell.rowNumber}:${cell.columnId}`
    if (!serverValues.has(key)) {
      hasConflicts = true
      return {
        ...cell,
        conflict: { serverValue: null, resolution: "unresolved" as const },
      }
    }
    const serverValue = serverValues.get(key) as WorkbookCellValue
    if (Object.is(serverValue, cell.originalValue)) {
      return { ...cell, originalValue: serverValue, conflict: undefined }
    }
    hasConflicts = true
    return {
      ...cell,
      originalValue: serverValue,
      conflict: { serverValue, resolution: "unresolved" as const },
    }
  })
  return workbookDraftRecordSchema.parse({
    ...draft,
    serverBaseVersion: currentVersion,
    cells,
    updatedAt: now,
    status: hasConflicts ? "conflict" : "dirty",
    pendingSave: draft.pendingSave
      ? { ...draft.pendingSave, retryable: false, lastErrorCode: "VERSION_CONFLICT" }
      : undefined,
  })
}

export function resolveWorkbookDraftConflict(
  draft: WorkbookDraftRecord,
  rowNumber: number,
  columnId: string,
  resolution: "keep-local" | "use-server",
  now = new Date().toISOString(),
): WorkbookDraftRecord | null {
  const cells = draft.cells.flatMap((cell) => {
    if (cell.rowNumber !== rowNumber || cell.columnId !== columnId) return [cell]
    if (resolution === "use-server") return []
    if (!cell.conflict) return [cell]
    return [{
      ...cell,
      conflict: { ...cell.conflict, resolution: "keep-local" as const },
    }]
  })
  if (cells.length === 0) return null
  const hasUnresolved = cells.some(
    (cell) => cell.conflict?.resolution === "unresolved",
  )
  return workbookDraftRecordSchema.parse({
    ...draft,
    cells,
    updatedAt: now,
    status: hasUnresolved ? "conflict" : "dirty",
  })
}
