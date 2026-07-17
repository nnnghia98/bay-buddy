import "fake-indexeddb/auto"

import { beforeEach, describe, expect, it } from "vitest"

import {
  acknowledgeWorkbookSave,
  classifyWorkbookDraftHydration,
  createWorkbookDraft,
  reconcileWorkbookDraft,
  resolveWorkbookDraftConflict,
  updateWorkbookDraftCell,
  withPendingWorkbookSave,
  withWorkbookSaveError,
} from "./draft-schema"
import {
  cleanupWorkbookDrafts,
  clearWorkbookDraftsForUser,
  deleteWorkbookDraft,
  getWorkbookDraft,
  listWorkbookDraftSummaries,
  putWorkbookDraft,
  resetWorkbookDraftDatabaseForTests,
} from "./draft-store"

const userOne = "2a7858e8-e1d0-4cda-a08d-9f86ac9e734b"
const userTwo = "1627af5f-52f4-48e3-893f-faa00244f921"
const sessionOne = "b128452e-c49f-4be8-9794-bb399c1fd050"
const sessionTwo = "18dbd918-d23e-4daa-93ad-edbb16e67f5a"
const workbookId = "ab6404d8-ef57-41f6-b8d6-98bd0a7b51c0"

function identity(userId = userOne, sessionId = sessionOne) {
  return {
    userId,
    sessionId,
    workbookId,
    originalFilename: "prices.xlsx",
    sheetName: "Tickets",
  }
}

function dirtyDraft(userId = userOne, sessionId = sessionOne, now?: string) {
  return updateWorkbookDraftCell(
    createWorkbookDraft(identity(userId, sessionId), 2, now),
    identity(userId, sessionId),
    2,
    {
      rowNumber: 7,
      columnId: "selling-price",
      originalValue: 1_000_000,
      localInput: "1.200.000",
      localValue: 1_200_000,
      matchesOriginal: false,
    },
    now,
  )!
}

beforeEach(async () => {
  await resetWorkbookDraftDatabaseForTests()
})

describe("workbook draft storage", () => {
  it("stores drafts without workbook blobs and isolates users and sessions", async () => {
    await putWorkbookDraft(dirtyDraft())
    await putWorkbookDraft(dirtyDraft(userTwo, sessionOne))
    await putWorkbookDraft(dirtyDraft(userOne, sessionTwo))

    const first = await getWorkbookDraft(userOne, sessionOne)
    expect(first?.cells[0]).toMatchObject({
      originalValue: 1_000_000,
      localValue: 1_200_000,
    })
    expect(first).not.toHaveProperty("blob")
    expect((await listWorkbookDraftSummaries(userOne))[sessionOne]?.dirtyCount).toBe(1)
    expect(Object.keys(await listWorkbookDraftSummaries(userOne))).toHaveLength(2)
    expect(Object.keys(await listWorkbookDraftSummaries(userTwo))).toEqual([sessionOne])
  })

  it("classifies matching, stale, and future hydration safely", () => {
    const draft = dirtyDraft()
    expect(classifyWorkbookDraftHydration(null, 2).kind).toBe("empty")
    expect(classifyWorkbookDraftHydration(draft, 2).kind).toBe("matching")
    expect(classifyWorkbookDraftHydration(draft, 3).kind).toBe("stale")
    expect(classifyWorkbookDraftHydration(draft, 1).kind).toBe("future")
  })

  it("persists the exact pending request id and payload", async () => {
    const payload = {
      request_id: "0d98086b-d363-4ed5-819a-07891d3a03cb",
      base_version: 2,
      changes: [{ row_number: 7, values: { "selling-price": 1_200_000 } }],
    }
    await putWorkbookDraft(withPendingWorkbookSave(dirtyDraft(), payload))

    const restored = await getWorkbookDraft(userOne, sessionOne)
    expect(restored?.pendingSave?.requestId).toBe(payload.request_id)
    expect(restored?.pendingSave?.payload).toEqual(payload)
    expect(restored?.pendingSave?.retryable).toBe(true)
    expect(restored?.pendingSave?.submittedCells).toEqual([
      { rowNumber: 7, columnId: "selling-price", value: 1_200_000 },
    ])
  })

  it("retries only transient pending-save failures", () => {
    const payload = {
      request_id: "0d98086b-d363-4ed5-819a-07891d3a03cb",
      base_version: 2,
      changes: [{ row_number: 7, values: { "selling-price": 1_200_000 } }],
    }
    const pending = withPendingWorkbookSave(dirtyDraft(), payload)

    expect(withWorkbookSaveError(pending, "REQUEST_FAILED").pendingSave?.retryable).toBe(true)
    expect(withWorkbookSaveError(pending, "INVALID_CELL_VALUE").pendingSave?.retryable).toBe(false)
    expect(withWorkbookSaveError(pending, "SESSION_NOT_ACTIVE").pendingSave?.retryable).toBe(false)
  })

  it("acknowledges only cells from the submitted snapshot", () => {
    const payload = {
      request_id: "0d98086b-d363-4ed5-819a-07891d3a03cb",
      base_version: 2,
      changes: [{ row_number: 7, values: { "selling-price": 1_200_000 } }],
    }
    const saving = withPendingWorkbookSave(dirtyDraft(), payload)
    const withNewCell = updateWorkbookDraftCell(
      saving,
      identity(),
      2,
      {
        rowNumber: 8,
        columnId: "selling-price",
        originalValue: 2_000_000,
        localInput: "2.400.000",
        localValue: 2_400_000,
        matchesOriginal: false,
      },
    )!

    const acknowledged = acknowledgeWorkbookSave(
      withNewCell,
      3,
      payload.request_id,
    )!

    expect(acknowledged.serverBaseVersion).toBe(3)
    expect(acknowledged.status).toBe("dirty")
    expect(acknowledged.cells).toMatchObject([{ rowNumber: 8, localValue: 2_400_000 }])
    expect(acknowledged.pendingSave).toBeUndefined()
  })

  it("keeps a newer edit to a submitted cell and rebases its original value", () => {
    const payload = {
      request_id: "0d98086b-d363-4ed5-819a-07891d3a03cb",
      base_version: 2,
      changes: [{ row_number: 7, values: { "selling-price": 1_200_000 } }],
    }
    const saving = withPendingWorkbookSave(dirtyDraft(), payload)
    const newerEdit = updateWorkbookDraftCell(
      saving,
      identity(),
      2,
      {
        rowNumber: 7,
        columnId: "selling-price",
        originalValue: 1_000_000,
        localInput: "1.300.000",
        localValue: 1_300_000,
        matchesOriginal: false,
      },
    )!

    const acknowledged = acknowledgeWorkbookSave(
      newerEdit,
      3,
      payload.request_id,
    )!

    expect(acknowledged.cells).toMatchObject([{
      rowNumber: 7,
      localValue: 1_300_000,
      originalValue: 1_200_000,
    }])
  })

  it("clears a draft only when every current cell was acknowledged", () => {
    const payload = {
      request_id: "0d98086b-d363-4ed5-819a-07891d3a03cb",
      base_version: 2,
      changes: [{ row_number: 7, values: { "selling-price": 1_200_000 } }],
    }
    expect(acknowledgeWorkbookSave(
      withPendingWorkbookSave(dirtyDraft(), payload),
      3,
      payload.request_id,
    )).toBeNull()
  })

  it("clears one session or every draft for only the authenticated user", async () => {
    await putWorkbookDraft(dirtyDraft())
    await putWorkbookDraft(dirtyDraft(userOne, sessionTwo))
    await putWorkbookDraft(dirtyDraft(userTwo, sessionOne))

    await deleteWorkbookDraft(userOne, sessionOne)
    expect(await getWorkbookDraft(userOne, sessionOne)).toBeNull()
    expect(await getWorkbookDraft(userTwo, sessionOne)).not.toBeNull()

    expect(await clearWorkbookDraftsForUser(userOne)).toBe(1)
    expect(await getWorkbookDraft(userTwo, sessionOne)).not.toBeNull()
  })

  it("auto-rebases unchanged cells and marks true conflicts", () => {
    const draft = updateWorkbookDraftCell(
      dirtyDraft(),
      identity(),
      2,
      {
        rowNumber: 8,
        columnId: "selling-price",
        originalValue: 2_000_000,
        localInput: "2.400.000",
        localValue: 2_400_000,
        matchesOriginal: false,
      },
    )!
    const reconciled = reconcileWorkbookDraft(draft, 3, [
      { rowNumber: 7, columnId: "selling-price", value: 1_000_000 },
      { rowNumber: 8, columnId: "selling-price", value: 2_100_000 },
    ])

    expect(reconciled.serverBaseVersion).toBe(3)
    expect(reconciled.status).toBe("conflict")
    expect(reconciled.cells[0].conflict).toBeUndefined()
    expect(reconciled.cells[1].conflict).toEqual({
      serverValue: 2_100_000,
      resolution: "unresolved",
    })
  })

  it("does not create a false conflict for a cell added after a reconciliation lookup", () => {
    const beforeLookup = dirtyDraft()
    const withNewCell = updateWorkbookDraftCell(
      beforeLookup,
      identity(),
      2,
      {
        rowNumber: 8,
        columnId: "selling-price",
        originalValue: 2_000_000,
        localInput: "2.400.000",
        localValue: 2_400_000,
        matchesOriginal: false,
      },
    )!

    const reconciled = reconcileWorkbookDraft(withNewCell, 3, [
      { rowNumber: 7, columnId: "selling-price", value: 1_000_000 },
    ], beforeLookup.cells)

    expect(reconciled.cells).toHaveLength(2)
    expect(reconciled.cells[1].conflict).toBeUndefined()
  })

  it("requires keep-local or use-server conflict choices", () => {
    const conflicted = reconcileWorkbookDraft(dirtyDraft(), 3, [
      { rowNumber: 7, columnId: "selling-price", value: 1_100_000 },
    ])
    const kept = resolveWorkbookDraftConflict(
      conflicted,
      7,
      "selling-price",
      "keep-local",
    )!
    expect(kept.status).toBe("dirty")
    expect(kept.cells[0].conflict?.resolution).toBe("keep-local")

    expect(resolveWorkbookDraftConflict(
      conflicted,
      7,
      "selling-price",
      "use-server",
    )).toBeNull()
  })

  it("bounds cleanup by age, count, and known server sessions", async () => {
    const now = Date.parse("2026-07-15T00:00:00.000Z")
    await putWorkbookDraft(dirtyDraft(userOne, sessionOne, "2026-06-01T00:00:00.000Z"))
    await putWorkbookDraft(dirtyDraft(userOne, sessionTwo, "2026-07-14T00:00:00.000Z"))
    await putWorkbookDraft(dirtyDraft(userTwo, sessionOne, "2026-06-01T00:00:00.000Z"))

    const removed = await cleanupWorkbookDrafts({
      userId: userOne,
      now,
      maxAgeMs: 30 * 24 * 60 * 60 * 1000,
      maxRecords: 1,
      existingSessionIds: new Set([sessionTwo]),
    })

    expect(removed).toBe(1)
    expect(await getWorkbookDraft(userOne, sessionOne)).toBeNull()
    expect(await getWorkbookDraft(userOne, sessionTwo)).not.toBeNull()
    expect(await getWorkbookDraft(userTwo, sessionOne)).not.toBeNull()
  })
})
