# Workbook Editor v2 — Fix Plan

## 1. Purpose

This plan addresses the correctness, data-integrity, security, concurrency, and performance issues found during the review of Workbook Editor v2 across commit range `b8e27ad^..HEAD`.

The plan prioritizes preventing silent data loss and workbook corruption before improving formula workflows and workbook-scale performance.

## 2. Goals

- Prevent local edits from being silently discarded.
- Keep workbook files, versions, and column metadata consistent under concurrent requests.
- Ensure users cannot bypass the guided formula model through ordinary text edits.
- Enforce Bay Buddy's VND pricing rules for semantic price fields.
- Make draft recovery deterministic across saves, version changes, structural mutations, reloads, and multiple tabs.
- Bound workbook processing using the meaningful worksheet dimensions validated during upload.
- Complete the formula editing and preview workflow.
- Return valid API responses for supported Excel cell values.
- Add regression coverage for every confirmed defect.

## 3. Priority Summary

| Priority | Workstream | Main risk addressed |
| --- | --- | --- |
| P0 | Save snapshot and draft lifecycle | Silent loss of edits made during a save |
| P0 | Column configuration serialization | Workbook file and metadata corruption |
| P0 | Formula injection prevention | Executable formulas bypassing the guided formula model |
| P0 | Semantic VND validation | Invalid financial values persisted in workbooks |
| P1 | Draft versioning and structural guards | False conflicts and unrecoverable local drafts |
| P1 | Upload streaming limit | Oversized multipart requests consuming temporary storage |
| P1 | Meaningful worksheet bounds | Formatting-only dimensions causing excessive processing |
| P1 | Formula editing and preview | Incomplete formula workflow and duplicate formula columns |
| P1 | Excel value normalization | API failures for time-only or duration cells |
| P2 | Reader and save efficiency | Excessive memory, CPU, hashing, and temporary-file I/O |

## 4. Implementation Workstreams

### 4.1 P0 — Make saves snapshot-safe

**Affected files**

- `web/src/components/workbook-editor/editor-workbench.tsx`
- `web/src/lib/workbooks/use-workbook-draft.ts`
- `web/src/lib/workbooks/draft-schema.ts`
- Associated draft and workbench tests

**Problem**

`handleSave` submits a snapshot of the current changes, but the table remains editable while the request is pending. On success, `localDraft.clear("saved")` removes the entire current draft, including edits created after the submitted snapshot.

**Implementation**

1. Add an immutable submitted-draft snapshot to the pending-save record:
   - Request ID
   - Base version
   - Exact submitted cell identities and submitted values
   - Draft revision or `updatedAt` captured at submission
2. On successful save, remove only cells that still match the submitted snapshot.
3. Preserve cells that were added or changed after submission.
4. Rebase preserved cells onto the returned `current_version`.
5. Clear the draft only when no unsaved cells remain.
6. Ensure save feedback becomes `saved` only when the local draft is empty; otherwise return to `dirty` with the remaining edit count.
7. Keep table editing available during saves only after selective acknowledgement is implemented. As a short-term safety measure, disabling editing while saving is acceptable but should not replace selective acknowledgement.

**Regression tests**

- Edit A, save, edit B before success → A is removed and B remains dirty.
- Edit A, save, change A again before success → the newer A value remains dirty.
- Save completes without newer edits → draft is cleared.
- Replayed pending request acknowledges only its original cell snapshot.
- Failed save preserves every local edit.

**Acceptance criteria**

- No successful response can delete a cell edit that was not included in that request.
- IndexedDB and TanStack Query contain the same remaining draft after acknowledgement.

---

### 4.2 P0 — Serialize column display configuration

**Affected files**

- `api/services/workbook_service.py`
- `api/routes/workbooks.py`
- `api/schemas/workbook.py`
- Workbook service and route tests

**Problem**

`update_session_column_configuration` reads and replaces the complete `column_config` without the lock and row-level serialization used by structural column mutations. A stale hide/pin request can overwrite metadata from a newly committed add, update, or remove-column operation.

**Implementation**

1. Execute configuration updates inside `_serialize_local_save(db, session_id)`.
2. Load the session using `SELECT ... FOR UPDATE` inside the serialized block.
3. Add `base_version` to the configuration-update request.
4. Return `VERSION_CONFLICT` when `base_version != current_version`.
5. Apply visibility and sticky changes to the freshly loaded configuration rather than replacing it from a caller-owned snapshot.
6. Preserve all structural fields, formula definitions, semantic mappings, and newly added columns.
7. Keep display-only updates versionless after the current-version precondition succeeds.

**Regression tests**

- Concurrent hide and add-column requests cannot drop the new column.
- Concurrent pin and remove-column requests cannot restore a removed column.
- Stale configuration request returns `VERSION_CONFLICT`.
- Configuration changes do not create a new workbook version.
- Unknown column IDs continue to return `COLUMN_NOT_FOUND`.

**Acceptance criteria**

- `column_config` always describes the physical columns in `current_version`.
- Display updates cannot overwrite structural metadata from a newer version.

---

### 4.3 P0 — Prevent formula injection through text edits

**Affected files**

- `api/services/workbook_mutation.py`
- `api/services/workbook_reader.py`
- Workbook mutation and API-flow tests

**Problem**

Text values beginning with `=` are assigned directly to openpyxl cells, which stores them as Excel formulas. This bypasses the guided, versioned, row-local formula AST.

**Implementation**

1. Reject ordinary editable-cell text beginning with formula-significant prefixes, at minimum `=`.
2. Prefer returning `INVALID_CELL_VALUE` with a safe, user-facing validation message.
3. Do not silently prepend an apostrophe unless product requirements explicitly define that behavior; silent transformation makes round-tripping ambiguous.
4. Keep generated formulas exclusive to the managed formula-column path.
5. Confirm that imported source formulas remain readable and non-editable.
6. Consider blocking other spreadsheet formula prefixes only where the target Excel format interprets them as formulas.

**Regression tests**

- `=1+1` in an editable text cell is rejected.
- `=HYPERLINK(...)` is rejected.
- Normal text is preserved exactly.
- Existing imported formula cells remain non-editable.
- Managed formula columns still generate valid Excel formulas.

**Acceptance criteria**

- Ordinary cell editing cannot create or replace an Excel formula.
- Every generated formula originates from a validated `WorkbookColumnFormula` AST.

---

### 4.4 P0 — Restore semantic VND validation

**Affected files**

- `api/services/workbook_mutation.py`
- `api/services/workbook_service.py`
- `web/src/components/workbook-editor/editor-workbench.tsx`
- Shared frontend workbook validation
- Backend and frontend tests

**Problem**

Mapped `net_price` and `selling_price` columns are represented as `currency`, but configured saves pass them through generic numeric normalization. This permits negative, fractional, and excessively large values that the existing `_normalize_vnd` path rejects.

**Implementation**

1. Dispatch validation using both `semantic_field` and `data_type`.
2. Apply `_normalize_vnd` when `semantic_field` is `net_price` or `selling_price`.
3. Keep generic currency validation for user-defined currency columns if signed or fractional values are intentionally supported.
4. Mirror semantic VND constraints in frontend draft validation:
   - Integer only
   - Non-negative
   - Maximum supported VND amount
5. Return field-specific validation feedback before save.
6. Keep the backend authoritative even when the frontend validates first.

**Regression tests**

- Semantic price accepts `0` and valid positive whole VND values.
- Semantic price rejects negatives.
- Semantic price rejects fractions.
- Semantic price rejects values above the supported maximum.
- A generic user currency column follows its separately documented rules.

**Acceptance criteria**

- `net_price` and `selling_price` cannot violate Bay Buddy's VND integer rules through any save path.

---

### 4.5 P1 — Use the current version for new drafts

**Affected files**

- `web/src/components/workbook-editor/editor-workbench.tsx`
- `web/src/lib/workbooks/use-workbook-draft.ts`
- Draft reconciliation tests

**Problem**

`useWorkbookDraft` receives `initialSession.current_version` rather than the evolving `baseVersion`. After a save or structural mutation, the next draft is stamped with the stale initial version and unnecessarily enters reconciliation.

**Implementation**

1. Pass the live `baseVersion` into `useWorkbookDraft`.
2. Ensure a newly created draft uses the latest acknowledged version.
3. When `baseVersion` changes while a draft exists, reconcile only drafts that genuinely predate the new version.
4. Snapshot the exact cells included in a reconciliation lookup.
5. Do not mark cells added during an in-flight lookup as conflicts merely because they were absent from that lookup.
6. Queue or repeat reconciliation when the draft revision changes during lookup.

**Regression tests**

- First edit after save uses the returned current version.
- First edit after add/remove/update-column uses the returned current version.
- A cell added during reconciliation is not assigned a false `serverValue: null` conflict.
- Genuine server-side changes still produce conflicts.

**Acceptance criteria**

- Fresh edits against the current version do not enter recovery mode.
- Reconciliation applies only to the exact draft revision it inspected.

---

### 4.6 P1 — Block structural mutations while drafts exist

**Affected files**

- `web/src/components/workbook-editor/editor-workbench.tsx`
- `web/src/components/workbook-editor/workbook-records-table.tsx`
- `web/src/components/workbook-editor/workbook-column-controls.tsx`
- Component tests

**Problem**

Toolbar column controls are disabled while drafts exist, but inline header actions can still remove, hide, or pin columns. Removing a column referenced by a local draft makes reconciliation fail with `COLUMN_NOT_FOUND`.

**Implementation**

1. Pass a unified structural-action disabled flag to every column action.
2. Disable remove, hide, pin, and unpin while `dirtyCount > 0` or save/reconciliation is pending.
3. Keep a clear explanation in the UI using an i18n tooltip or feedback message.
4. As defense in depth, detect drafts referencing a target column before dispatching removal.
5. If a column disappears because of another tab, preserve unrelated draft cells and surface a targeted conflict for the removed column rather than invalidating the complete draft.

**Regression tests**

- Header remove action is disabled when any draft exists.
- Header hide and pin actions follow the same guard.
- Actions re-enable after save or explicit draft clearing.
- A remotely removed column does not prevent recovery of unrelated cells.

**Acceptance criteria**

- A local user cannot remove a column that is referenced by an unsaved local draft.

---

### 4.7 P1 — Enforce upload size while receiving the request body

**Affected files**

- `api/routes/workbooks.py`
- `api/main.py`
- Upload route and middleware tests

**Problem**

The early middleware rejects only requests with an oversized `Content-Length`. Requests without that header can reach multipart parsing and temporary spooling before the service-level streaming limit is applied.

**Implementation**

1. Replace the header-only check with an ASGI receive wrapper that counts body bytes as chunks arrive.
2. Stop forwarding body chunks and return `413 FILE_TOO_LARGE` once the request limit is exceeded.
3. Keep a bounded multipart overhead allowance separate from the workbook file limit.
4. Apply the limiter before FastAPI multipart parsing.
5. Preserve service-level file-byte enforcement as defense in depth.
6. Ensure temporary parser files are closed and removed on rejection.
7. Keep authentication behavior consistent without requiring the entire body to be parsed first.

**Regression tests**

- Oversized request with `Content-Length` is rejected before route execution.
- Oversized chunked request without `Content-Length` is rejected during receive.
- Valid chunked upload succeeds.
- Multipart overhead does not incorrectly reduce the configured workbook file limit.
- Temporary files are cleaned after rejection.

**Acceptance criteria**

- No request can cause FastAPI to spool an unbounded workbook body before size rejection.

---

### 4.8 P1 — Carry meaningful worksheet bounds through the full lifecycle

**Affected files**

- `api/services/workbook_validation.py`
- `api/models/workbook.py`
- `api/services/workbook_service.py`
- `api/services/workbook_reader.py`
- `api/services/workbook_mutation.py`
- Migrations if new persisted fields are required

**Problem**

Upload validation computes meaningful bounds that exclude formatting-only dimensions, but later operations use `worksheet.max_row` and `worksheet.max_column`. Formatting copied to Excel's last row or column can therefore turn an accepted workbook into a huge scan.

**Implementation**

1. Treat validated meaningful `max_row` and `max_column` as canonical processing bounds.
2. Persist the selected sheet's meaningful bounds on the session or in versioned metadata.
3. Use those bounds for:
   - Session type inference
   - Header inspection
   - Records reading
   - Sparse cell lookup
   - Formula preview
   - Formula regeneration
   - Structural-column position checks
   - Generated-workbook validation
4. Update bounds deliberately when a structural mutation or managed edit extends the meaningful data area.
5. Do not use formatting-only dimensions to choose a new column position.
6. Reject or normalize workbooks whose declared dimensions are pathologically larger than meaningful content when safe bounded processing cannot be guaranteed.

**Regression tests**

- Workbook with 100 meaningful rows and formatting through row 1,048,576 processes only meaningful rows.
- Workbook with two meaningful columns and formatting through column 256 adds the next user column at column 3.
- Records pagination, search, and sort stay inside persisted bounds.
- Formula preview and save validation stay inside persisted bounds.

**Acceptance criteria**

- The validated row and column limits remain effective for every later workbook operation.

---

### 4.9 P1 — Complete formula editing and preview

**Affected files**

- `web/src/components/workbook-editor/workbook-column-controls.tsx`
- `web/src/components/workbook-editor/formula-builder-dialog.tsx`
- `web/src/components/workbook-editor/simple-formula-builder.tsx`
- `web/src/components/workbook-editor/formula-preview.tsx`
- `web/src/components/workbook-editor/editor-workbench.tsx`
- `web/src/lib/workbooks/client.ts`
- Formula UI tests

**Problem**

Every formula submission passes an undefined column ID, so it always creates a new column. Existing formula updates are unreachable, and the implemented server-preview client and preview components are not connected to the active workflow.

**Implementation**

1. Add explicit create and edit modes to the formula dialog.
2. Allow selecting an existing user-owned formula column for editing.
3. Let staff select two columns, one operation between them, and an optional
   third column with a second operation.
4. Convert the compact selection into the validated formula AST while following
   normal arithmetic precedence.
5. Call `previewWorkbookFormula` before enabling final Apply.
6. Show normalized expression, sample results, warnings, and row-level errors through `FormulaPreview`.
7. Parse compatible stored formulas back into the compact editor. Require an
   explicit reset before replacing an older advanced formula that cannot be
   represented safely.
8. Send the existing column ID to `updateWorkbookColumn` in edit mode.
9. Preserve output type selection for both `number` and `currency`.
10. Invalidate records, session, and library caches after successful formula updates.

**Regression tests**

- Creating a formula calls add-column once.
- Editing an existing formula calls update-column with its ID.
- Updating does not create a duplicate column.
- Invalid or cyclic formula cannot be applied.
- Division-by-zero sample errors appear before mutation.
- Currency formula output remains currency.
- Two- and three-column selections produce the expected arithmetic AST.
- Older advanced formulas are never flattened or overwritten silently.

**Acceptance criteria**

- Users can create, preview, and edit managed 2–3 column formulas without
  duplicating columns.

---

### 4.10 P1 — Normalize time-only and duration cells

**Affected files**

- `api/schemas/workbook.py`
- `api/services/workbook_reader.py`
- `api/services/workbook_xls_conversion.py`
- `web/src/schemas/workbook.ts`
- Reader, schema, and API tests

**Problem**

openpyxl can return `datetime.time` or duration-like values, while `WorkbookCellValue` excludes them. Valid workbooks can therefore fail API response validation.

**Implementation**

1. Define a stable API representation instead of exposing library-specific Python types.
2. Recommended normalization:
   - Time-only value → ISO local time string such as `15:30:00`
   - Duration → documented numeric duration or ISO-8601 duration string
3. Normalize values at the reader boundary before constructing response models.
4. Keep date and datetime handling distinct.
5. Update frontend Zod schemas and cell formatting for the chosen representation.
6. Ensure editing a date does not silently drop an existing time component; either support datetime editing or mark datetime cells read-only until supported.

**Regression tests**

- Time-only XLSX cell returns a valid API value.
- Time-only XLS-converted cell returns the same representation.
- Duration cell returns the documented representation.
- Date and datetime cells continue to round-trip correctly.
- Response-model validation succeeds for all supported cell types.

**Acceptance criteria**

- Supported Excel temporal values cannot cause records or lookup endpoints to return a 500.

## 5. Secondary Hardening Backlog

Complete these after the P0/P1 work unless implementation reveals a direct dependency.

### 5.1 Reject duplicate physical cell targets

Canonicalize semantic aliases and stable column IDs before preparing mutations. Reject a request that addresses the same physical cell twice through identifiers such as `net_price` and its `source-*` ID.

### 5.2 Validate populated cells when changing a column type

Before changing a user column from text to number, currency, date, or boolean, validate or explicitly convert every populated value. Do not update metadata while leaving incompatible physical values.

### 5.3 Improve records pagination memory use

Keep the accepted O(rows) scan where required, but avoid retaining full values and editability maps for every matching row before slicing one page.

### 5.4 Reduce save-validation memory

Avoid keeping two complete mutable openpyxl workbook graphs while comparing every coordinate. Prefer bounded read-only or OOXML-level comparison plus audited-coordinate verification.

### 5.5 Reduce validation coordinate memory

Do not store every meaningful cell coordinate solely to validate merged anchors. Track only merged anchors or use a compact bounded representation.

### 5.6 Avoid repeated immutable-object materialization

For local immutable storage, expose a verified read-only path or cache verification by immutable object identity. Keep temporary materialization for remote storage implementations.

### 5.7 Restore conflict-state exits and current-output download

- Reset conflict feedback when the final conflict is resolved with the server value.
- Keep current-version download available during conflicts.
- Add confirmation before navigating away with unsaved changes.

### 5.8 Classify pending-save retryability

Automatically replay only network failures and selected transient server errors. Preserve the draft but stop automatic replay for deterministic validation, authorization, inactive-session, and idempotency errors.

### 5.9 Clamp session-library pagination after deletion

When deleting the final session on the final page, move to the new last valid page and keep pagination controls available in an empty-page state.

### 5.10 Review all-time data wipe coverage

Ensure the administrative all-time wipe explicitly handles workbook tables and their `created_by` foreign keys before deleting users.

## 6. Delivery Sequence

### Phase A — Data safety and security

1. Snapshot-safe save acknowledgement.
2. Serialized configuration writes with `base_version`.
3. Formula-injection rejection.
4. Semantic VND validation.
5. Duplicate physical-target rejection.

**Exit gate:** No known path silently loses edits, corrupts column metadata, injects unmanaged formulas, or persists invalid semantic prices.

### Phase B — Draft and structural consistency

1. Live draft base version.
2. Reconciliation revision handling.
3. Structural guards while drafts exist.
4. Conflict-state cleanup and download availability.
5. Retryability classification.

**Exit gate:** Save, recovery, multi-tab conflict, and structural mutation flows are deterministic and recoverable.

### Phase C — Bounded workbook processing

1. Streaming request-body limit.
2. Persisted meaningful worksheet bounds.
3. Bounded reader, preview, mutation, and validation loops.
4. Pagination and validation memory improvements.

**Exit gate:** Formatting-only workbook dimensions cannot bypass configured processing limits.

### Phase D — Formula and value compatibility

1. Formula create/edit modes.
2. Expression-tree editor integration.
3. Server preview integration.
4. Time-only and duration normalization.
5. Column-type conversion validation.

**Exit gate:** Formula workflows are complete, previewed, and compatible with supported Excel values.

## 7. Verification Strategy

### Backend

Run targeted tests during each workstream, then the complete backend suite:

```bash
cd api
poetry run pytest tests/test_workbook_mutation.py
poetry run pytest tests/test_workbook_service.py
poetry run pytest tests/test_workbook_reader.py
poetry run pytest tests/test_workbook_routes.py
poetry run pytest tests/test_workbook_api_flow.py
poetry run pytest
```

### Frontend

Run targeted tests, type checking, and production build:

```bash
cd web
yarn test workbook
yarn lint
yarn build
```

Use the repository's available test scripts if their exact names differ from the examples above.

### End-to-end scenarios

1. Upload a normal `.xlsx`, edit, save, and download.
2. Edit while a save is pending and confirm the newer edit remains.
3. Open the same session in two tabs and exercise save and reconciliation.
4. Attempt hide/pin concurrently with add/remove-column.
5. Attempt a raw `=` text edit and confirm validation rejection.
6. Attempt invalid semantic VND values.
7. Upload a workbook with formatting extended to the final Excel row and verify bounded processing.
8. Create, preview, edit, and download a formula column.
9. Read a workbook containing time-only and duration cells.
10. Remove the final session on the final library page.

## 8. Definition of Done

- Every P0 and P1 regression has an automated test.
- Backend tests pass.
- Frontend tests, lint, type checking, and production build pass.
- The affected flows are verified end to end against a running API and web application.
- No API write endpoint loses authentication or RBAC enforcement.
- All new UI text uses `next-international` with Vietnamese-first and English translations.
- OpenAPI output and generated frontend API types are regenerated when request or response contracts change.
- Database migrations are included for any persisted meaningful-bound fields.
- Documentation is updated if formula, temporal-value, or currency behavior changes.
