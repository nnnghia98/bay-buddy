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
  submittedCells: z.array(z.object({
    rowNumber: z.number().int().positive(),
    columnId: z.string().min(1).max(255),
    value: workbookDraftValueSchema,
  })).max(WORKBOOK_DRAFT_MAX_CELLS).optional(),
  draftRevision: z.number().int().nonnegative().default(0),
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
  // Defaults keep locally persisted v1 drafts readable after this field was added.
  revision: z.number().int().nonnegative().default(0),
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
    revision: 0,
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
    revision: draft.revision + 1,
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
  const submittedCells = payload.changes.flatMap((change) => Object.entries(change.values).map(
    ([columnId, value]) => ({ rowNumber: change.row_number, columnId, value }),
  ))
  return workbookDraftRecordSchema.parse({
    ...draft,
    status: "saving",
    updatedAt: now,
    pendingSave: {
      requestId: payload.request_id,
      payload,
      submittedCells,
      draftRevision: draft.revision,
      createdAt: now,
      retryable: true,
    },
  })
}

/**
 * Acknowledge only the cells that are still identical to the request snapshot.
 * Edits made while the request was in flight remain as a rebased local draft.
 */
export function acknowledgeWorkbookSave(
  draft: WorkbookDraftRecord,
  currentVersion: number,
  requestId: string,
  now = new Date().toISOString(),
): WorkbookDraftRecord | null {
  if (draft.pendingSave?.requestId !== requestId) return draft

  const submittedCells = draft.pendingSave.submittedCells ?? draft.pendingSave.payload.changes.flatMap(
    (change) => Object.entries(change.values).map(
      ([columnId, value]) => ({ rowNumber: change.row_number, columnId, value }),
    ),
  )
  const submitted = new Map(
    submittedCells.map((cell) => [
      `${cell.rowNumber}:${cell.columnId}`,
      cell.value,
    ]),
  )
  const cells = draft.cells.flatMap((cell) => {
    const submittedValue = submitted.get(`${cell.rowNumber}:${cell.columnId}`)
    if (submittedValue === undefined && !submitted.has(`${cell.rowNumber}:${cell.columnId}`)) {
      return [cell]
    }
    const localValue = cell.localValue ?? cell.localInput
    if (Object.is(localValue, submittedValue)) return []
    return [{
      ...cell,
      // The acknowledged value is now the correct server-side baseline for the newer edit.
      originalValue: submittedValue as WorkbookCellValue,
      conflict: undefined,
    }]
  })
  if (cells.length === 0) return null
  const hasUnresolved = cells.some((cell) => cell.conflict?.resolution === "unresolved")
  return workbookDraftRecordSchema.parse({
    ...draft,
    serverBaseVersion: currentVersion,
    revision: draft.revision + 1,
    cells,
    updatedAt: now,
    status: hasUnresolved ? "conflict" : "dirty",
    pendingSave: undefined,
  })
}

export function withWorkbookSaveError(
  draft: WorkbookDraftRecord,
  code: string,
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  const retryableCodes = new Set([
    "REQUEST_FAILED",
    "NETWORK_ERROR",
    "STORAGE_WRITE_FAILED",
    "SERVICE_UNAVAILABLE",
  ])
  return workbookDraftRecordSchema.parse({
    ...draft,
    status: code === "VERSION_CONFLICT" ? "conflict" : "error",
    updatedAt: now,
    pendingSave: draft.pendingSave
      ? {
          ...draft.pendingSave,
          retryable: retryableCodes.has(code),
          lastErrorCode: code,
        }
      : undefined,
  })
}

export function reconcileWorkbookDraft(
  draft: WorkbookDraftRecord,
  currentVersion: number,
  serverCells: WorkbookCellServerValue[],
  inspectedCells: readonly Pick<WorkbookDraftCell, "rowNumber" | "columnId">[] = draft.cells,
  now = new Date().toISOString(),
): WorkbookDraftRecord {
  const inspectedKeys = new Set(
    inspectedCells.map((cell) => `${cell.rowNumber}:${cell.columnId}`),
  )
  const serverValues = new Map(
    serverCells.map((cell) => [`${cell.rowNumber}:${cell.columnId}`, cell.value]),
  )
  let hasConflicts = false
  const cells = draft.cells.map((cell) => {
    const key = `${cell.rowNumber}:${cell.columnId}`
    if (!inspectedKeys.has(key)) return cell
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
  const hasUnresolved = hasConflicts || cells.some(
    (cell) => cell.conflict?.resolution === "unresolved",
  )
  return workbookDraftRecordSchema.parse({
    ...draft,
    serverBaseVersion: currentVersion,
    revision: draft.revision + 1,
    cells,
    updatedAt: now,
    status: hasUnresolved ? "conflict" : "dirty",
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
    revision: draft.revision + 1,
    updatedAt: now,
    status: hasUnresolved ? "conflict" : "dirty",
  })
}
