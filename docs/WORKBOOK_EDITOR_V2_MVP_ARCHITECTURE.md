# Workbook Editor V2 Architecture

Status: Implemented locally
Scope: Current authenticated workbook workflow
Target: Local development

## 1. Outcome

Workbook Editor V2 gives authenticated Bay Buddy staff one safe workflow:

1. Upload an `.xlsx` workbook or a legacy `.xls` workbook.
2. Select a supported worksheet.
3. Create an independent editing session.
4. Find business rows through a paginated table.
5. Edit supported source cells and typed user columns.
6. Add, rename, configure, or remove user columns and create safe row-local formulas.
7. Recover browser-local drafts and resolve version conflicts explicitly.
8. Explicitly save changes as a new immutable version.
9. Reopen, rename, or discard saved sessions from the session library.
10. Download the current edited workbook.

The uploaded original and every previous version remain unchanged. The existing
workbook-related surfaces remain untouched.

## 2. MVP boundaries

### Included

- New frontend namespace at `/workbook-editor-v2`.
- Authenticated ADMIN and STAFF access.
- `.xlsx` upload and validation, plus safe `.xls` normalization to `.xlsx`.
- Configurable local filesystem storage behind a storage interface.
- Immutable original, editing session, immutable versions, and save audit.
- One selected worksheet per editing session.
- Automatic mapping of supported Vietnamese and English headers.
- Paginated records, search, and supported-field sorting.
- All source worksheet columns remain visible in the editor.
- Staff can append typed user columns as new immutable versions.
- Per-session column visibility and sticky-column choices persist independently
  from workbook content versions.
- Inline drafts for editable source and user-column cells, persisted locally in
  IndexedDB and isolated by authenticated user and session.
- Guided 2–3 column formula builder with arithmetic operations between columns,
  versioned row-local expressions, server preview, dependency-cycle checks, and
  generated Excel formulas.
- Session library with search, status filters, rename, soft discard, and local
  draft status.
- Automatic bounded header-row detection without a staff-facing setup control.
- Explicit Save action with validation, idempotency, and version conflicts.
- Current-version download.
- Vietnamese-first UI and explicit loading, dirty, saving, failure, and conflict states.

### Deferred

- Autosave, debounce, optimistic version advancement, bulk paste, and spreadsheet
  keyboard navigation.
- Manual semantic-field mapping and named column presets.
- Row detail drawer.
- Multi-sheet editing within one session.
- Version-history UI, restore, and historical downloads.
- `.xlsm`, CSV, encrypted workbooks, macros, and advanced spreadsheet mode.
- Cloud storage, Railway Volume, deployment, CI/CD, and production rollout.
- Importing workbook records into Bay Buddy ticket, customer, or ledger tables.
- Very-large-workbook indexing, background processing, and collaboration.

## 3. Repository fit

- FastAPI routers are registered centrally in `api/main.py` with `/api/v1`
  prefixes.
- Authentication uses `CurrentUserDep`; authorization uses
  `require_user_roles`.
- Successful API responses use `{ success, data, error }`. Workbook errors add
  a stable error code without changing other API domains.
- SQLModel entities use UUID keys, user foreign keys, UTC audit timestamps, and
  JSON fields where appropriate.
- Routes remain thin. Workbook parsing, storage, and mutations stay in services.
- Initial App Router reads use React Server Components and the existing
  authenticated server fetch helper.
- Interactive table reads use TanStack Query and the existing authenticated
  client fetch helper.
- UI text is added to both Vietnamese and English locale files.
- `openpyxl`, `@tanstack/react-table`, and `idb` provide workbook processing,
  the controlled data table, and browser-local draft persistence.
- OpenAPI produces checked-in TypeScript types, not a runtime client. Runtime
  calls continue through Bay Buddy's fetch helpers.

## 4. Architecture and dependency boundaries

```text
Next.js RSC / client workbench
          |
          | authenticated REST
          v
FastAPI workbook routes
          |
          v
WorkbookService -----------------> SQLModel metadata/audit
     |             |
     |             +-------------> WorkbookReader
     |                                  |
     v                                  v
WorkbookStorage                    openpyxl
     |
     v
LocalWorkbookStorage
```

Rules:

- Route handlers never manipulate files or call `openpyxl` directly.
- `WorkbookService` owns authorization scope, orchestration, idempotency, and
  version transitions.
- `WorkbookReader` owns inspection, header mapping, record reads, and approved
  cell mutations.
- `WorkbookStorage` is the only filesystem boundary.
- Database records contain relative storage keys, never absolute paths.
- Workbook business logic depends on the storage interface, not local paths.

## 5. Directory structure

```text
api/
├── models/workbook.py
├── routes/workbooks.py
├── services/workbook_service.py
├── services/workbook_reader.py
├── storage/__init__.py
├── storage/workbooks.py
└── tests/
    ├── test_workbook_storage.py
    ├── test_workbook_reader.py
    └── test_workbook_routes.py

web/src/
├── app/workbook-editor-v2/
│   ├── page.tsx
│   ├── workbook-start-client.tsx
│   └── sessions/[sessionId]/
│       ├── page.tsx
│       ├── loading.tsx
│       └── error.tsx
├── components/workbook-editor/
│   ├── workbook-upload.tsx
│   ├── editor-workbench.tsx
│   ├── session-action-bar.tsx
│   ├── workbook-records-table.tsx
│   ├── editable-price-cell.tsx
│   ├── workbook-table-toolbar.tsx
│   ├── workbook-pagination.tsx
│   └── editor-feedback.tsx
├── lib/workbooks/
│   ├── server.ts
│   ├── client.ts
│   └── query-keys.ts
└── schemas/workbook.ts
```

V2-specific code stays within this namespace until reuse is proven.

## 6. Persistence model

### Workbook

Immutable uploaded source metadata:

- `id: UUID`
- `original_filename: str`
- `original_relative_path: str` (the validated `.xlsx` editor source; uploaded
  legacy `.xls` files are normalized before storage)
- `original_checksum: str` (SHA-256)
- `mime_type: str`
- `file_size: int`
- `sheet_count: int`
- `sheet_metadata: JSON`
- `created_by: UUID -> user.id`
- `created_at: datetime`

### WorkbookSession

Independent editing branch:

- `id: UUID`
- `workbook_id: UUID -> workbook.id`
- `selected_sheet_name: str`
- `header_row_number: int`
- `column_mapping: JSON`
- `current_version: int`, initially `1`
- `status: DRAFT | COMPLETED | DISCARDED | FAILED`
- `created_by: UUID -> user.id`
- `created_at: datetime`
- `updated_at: datetime`

Only `DRAFT` is mutated in the MVP. STAFF users can access only their own
workbooks and sessions. ADMIN users can access all sessions.

### WorkbookVersion

Immutable session snapshot:

- `id: UUID`
- `session_id: UUID -> workbook_session.id`
- `version_number: int`
- `relative_path: str`
- `checksum: str` (SHA-256)
- `file_size: int`
- `change_summary: JSON`
- `created_by: UUID -> user.id`
- `created_at: datetime`
- unique `(session_id, version_number)`

Version 1 is copied into the session namespace when a session is created.

### WorkbookOperation

Save audit and idempotency record:

- `id: UUID`
- `session_id: UUID -> workbook_session.id`
- `from_version: int`
- `to_version: int`
- `request_id: UUID`
- `operation_type: UPDATE_PRICES`
- `operation_payload: JSON`
- `payload_checksum: str`
- `changed_cells: int`
- `created_by: UUID -> user.id`
- `created_at: datetime`
- unique `(session_id, request_id)`

The payload records row numbers and price-field old/new values for audit. It
does not duplicate passenger or booking data.

## 7. Local storage contract

```python
class WorkbookStorage(Protocol):
    def put_immutable(self, *, key: str, source: BinaryIO) -> StoredObject: ...
    def open_read(self, *, key: str) -> BinaryIO: ...
    def exists(self, *, key: str) -> bool: ...
```

Initial keys:

```text
originals/{workbook_id}/source.xlsx
sessions/{session_id}/{version_number:06d}-{version_id}.xlsx
```

Configuration:

- `WORKBOOK_STORAGE_ROOT`, outside the served static tree.
- `WORKBOOK_MAX_UPLOAD_BYTES`, default 20 MiB.
- `WORKBOOK_MAX_ROWS`, default 20,000 for the selected worksheet.
- `WORKBOOK_MAX_COLUMNS`, default 100.
- `WORKBOOK_MAX_PAGE_SIZE`, default 200; UI default 50.

Safety rules:

- Storage keys are generated from UUIDs and version numbers, never filenames.
- Resolve keys below the configured root and reject absolute or escaping paths.
- Stream uploads into a temporary file while enforcing size and hashing.
- Validate before publishing.
- Publish a new unique path using same-filesystem atomic rename.
- Never overwrite an existing immutable object.
- Validate generated workbooks by reopening them before making them current.
- A DB failure after file publication may leave an unreferenced object; cleanup
  is deferred, but the database must never point to a missing object.

## 8. Workbook validation and mapping

Upload accepts `.xlsx` and legacy `.xls` files. `.xls` files are parsed into a
macro-free `.xlsx` editor source before the standard ZIP-container safety,
readability, worksheet, and complexity checks run. Formula cells are imported
as their stored values. `.xlsm`, malformed, encrypted, empty, unsafe, and
oversized workbooks are rejected.

Header detection scans the first 25 non-empty rows and selects the earliest
highest-scoring unambiguous semantic match. When no approved alias is found, it
uses the earliest row with the strongest text density. Normalization removes
accents, lowercases, trims, collapses whitespace, and treats punctuation as
separators.

Required mappings:

| Semantic field | Initial aliases |
|---|---|
| `net_price` | Giá gốc, Giá hệ thống, Giá net, Net Price, Cost Price, Cost |
| `selling_price` | Giá bán, Giá thu, Selling Price, Sale Price, Customer Price |

Optional identity mappings:

| Semantic field | Initial aliases |
|---|---|
| `passenger_name` | Nội dung, Hành khách, Tên hành khách, Họ tên, Passenger Name |
| `pnr` | Mã chỗ, Mã đặt chỗ, PNR, Booking Code, Booking Reference |
| `ticket_number` | Số vé, Ticket Number, Ticket No |

Price-field mappings are optional business metadata. Missing or ambiguous fields
are reported as guidance, and staff may still open the automatically detected
table.
The editor can show every source column and append typed user columns as new
immutable versions. Source columns are never removable, but may be hidden while
working. User-added columns may be removed by creating another immutable
version. Inspection returns the detected header and machine-readable mapping
details. Manual semantic mapping is deferred.

Physical Excel row number is the stable edit identity. Fully blank rows are
excluded. Formula, merged, or protected cells in editable columns are read-only
and rejected on save.

## 9. API contract

All endpoints are under `/api/v1/workbooks`, require ADMIN or STAFF, use the
standard success envelope, and enforce ownership.

### Upload

`POST /api/v1/workbooks/uploads`

- Multipart `file`.
- Returns `201` with workbook metadata, worksheets, detected header
  row, mapping, and mapping status.

### Create session

`POST /api/v1/workbooks/sessions`

```json
{
  "workbook_id": "uuid",
  "sheet_name": "Tickets"
}
```

- Uses the selected worksheet's automatically detected header; business-field
  mapping may remain incomplete or ambiguous.
- Creates immutable version 1.
- Multiple sessions from one workbook are supported by the data model, even if
  the initial UI normally creates one session after upload.

### Read session

`GET /api/v1/workbooks/sessions/{session_id}`

- Returns selected sheet, mapping, status, current version, and timestamps.

### Session library

- `GET /api/v1/workbooks/sessions` lists active sessions with pagination,
  search, and optional status filtering. STAFF sees owned sessions; ADMIN sees all.
- `PATCH /api/v1/workbooks/sessions/{session_id}` renames an active session.
- `DELETE /api/v1/workbooks/sessions/{session_id}` soft-discards an active session
  while preserving versions and audit history.

### Read records

`GET /api/v1/workbooks/sessions/{session_id}/records`

Query:

- `page`, default `1`
- `page_size`, default `50`, maximum `200`
- `search`, optional
- `sort_by`, restricted to returned stable column IDs
- `sort_direction`, `asc | desc`

Returns columns, physical row identifiers, values, cell editability, current
version, and `{ page, page_size, total, total_pages }`.

The MVP scans the current immutable workbook for each request. Search and sort
are O(rows), which is acceptable only because upload complexity is capped.

### Column and formula operations

- Column endpoints add, rename, retype, remove, hide, and pin user columns while
  protecting source columns and formula dependencies.
- `POST /api/v1/workbooks/sessions/{session_id}/formulas/preview` validates and
  evaluates a guided formula against sample rows without mutating the workbook.
- `POST /api/v1/workbooks/sessions/{session_id}/cell-values` reads a bounded set
  of current cells for safe local-draft reconciliation.

### Explicit save

`POST /api/v1/workbooks/sessions/{session_id}/saves`

```json
{
  "request_id": "uuid",
  "base_version": 3,
  "changes": [
    {
      "row_number": 25,
      "values": {
        "net_price": 1250000,
        "selling_price": 1400000
      }
    }
  ]
}
```

Rules:

- Only configured editable, non-formula columns are accepted.
- Values are validated by column type. Currency and numeric values must be
  finite and within the supported range; text, date, and boolean columns use
  their typed validation rules.
- At least one real change is required.
- Duplicate rows or fields are rejected.
- `base_version` must equal the locked session current version.
- Repeating the same request ID and payload returns the prior success.
- Reusing the request ID with different content returns `409`.
- A stale base version returns `409` with the current version.

The service locks/rechecks the session, loads the current version, changes only
approved cells, writes and validates a new immutable workbook, records the
version and operation, and advances `current_version`.

`openpyxl` work runs outside the async event loop through a threadpool boundary.

### Download

`GET /api/v1/workbooks/sessions/{session_id}/download`

- Returns a presentation-formatted copy of the current `.xlsx` as an authenticated attachment.
- Fits populated columns across every detected worksheet. Very long text columns
  use a bounded width with wrapping so one note cannot make the workbook
  excessively wide.
- Applies Bay Buddy header styling, readable typed alignment and number formats,
  alternating data rows, hidden gridlines, and frozen header rows while
  preserving values, formulas, existing semantic colors, hidden columns, and
  the immutable stored workbook version.
- Uses a sanitized original basename plus `-edited-v{version}.xlsx`.
- Calculates the download checksum and content length from the formatted bytes.
- Includes checksum-based `ETag`, content length, and workbook version header.

## 10. Error contract

Workbook errors add a stable code and safe details while retaining normal HTTP
status handling:

| Status | Codes |
|---|---|
| 413 | `FILE_TOO_LARGE` |
| 415 | `UNSUPPORTED_FILE_TYPE` |
| 422 | `INVALID_XLSX`, `UNSAFE_XLSX_ARCHIVE`, `WORKBOOK_LIMIT_EXCEEDED`, `MAPPING_INCOMPLETE`, `AMBIGUOUS_MAPPING`, `INVALID_ROW`, `INVALID_CELL_VALUE`, `CELL_NOT_EDITABLE` |
| 404 | `WORKBOOK_NOT_FOUND`, `SHEET_NOT_FOUND`, `SESSION_NOT_FOUND` |
| 409 | `SESSION_NOT_ACTIVE`, `VERSION_CONFLICT`, `IDEMPOTENCY_KEY_REUSED` |
| 500 | `STORAGE_OBJECT_MISSING`, `STORAGE_WRITE_FAILED` |

Filesystem paths, ZIP internals, and stack traces are never returned.

## 11. Frontend architecture

State ownership:

- URL: page, page size, search, sort field, sort direction.
- Server state: session and records keyed by session/version/query parameters.
- Local draft state: an IndexedDB record keyed by authenticated user and session,
  containing sparse edited cells, base version, pending request, and conflict data.
- Save state: `idle | dirty | saving | saved | error | conflict`.
- Concurrency: current `baseVersion` plus a client-generated request ID.

Initial session metadata and the first record page load through an RSC. The
client workbench uses TanStack Query for interactive paging, search, and sort.
It never loads the complete workbook.

Successful save updates the base version, clears confirmed drafts, invalidates
session/record queries, and announces `Đã lưu`. Validation or network failure
retains drafts. A conflict retains drafts and offers `Tải phiên bản mới nhất`
and current-output download; it never silently reapplies changes.

Navigating away with unsaved changes requires confirmation.

## 12. UX direction

Subject: Vietnamese travel-agency staff correcting ticket prices in imported
Excel workbooks.

Single job: identify a business row, update its two prices, save a safe version,
and download it.

The design uses existing Bay Buddy colors, typography, density, panels, tables,
and status patterns. Its one signature treatment is a restrained **pricing
rail**: `Giá gốc` and `Giá bán` remain together in a subtly blue-tinted pinned
band at the right edge of the table. This makes the task distinctive without
adding decoration.

```text
Breadcrumb: Workbook Editor V2 / Bang-gia-thang-7.xlsx

┌──────────────────────────────────────────────────────────────────────┐
│ Bang-gia-thang-7.xlsx  [Original protected]  Version 3               │
│ Sheet: Tickets  [Search…]                  [Download] [Save changes] │
│                                        status: 2 unsaved changes     │
├──────────────────────────────────────────────────────────────────────┤
│ Passenger │ PNR │ Ticket │ … │   GIÁ GỐC    │      GIÁ BÁN          │
│ Nguyen A  │ ABC │ 738…   │ … │ [1.500.000]  │ [1.750.000]           │
│ sticky identity                 pinned pricing rail                  │
├──────────────────────────────────────────────────────────────────────┤
│ 1–50 of 428                         [Previous] Page 1/9 [Next]       │
└──────────────────────────────────────────────────────────────────────┘
```

The workbench avoids title cards, metrics, and decorative workbook illustrations.
Compact toolbar controls add user columns and open the column manager. Narrow
screens preserve row/column relationships with horizontal scrolling.

## 13. Core invariants

1. Uploaded source bytes never change.
2. Existing versions are never overwritten or deleted by saving.
3. Sessions derived from one workbook remain independent.
4. `current_version` always resolves to an existing version in its session.
5. Every successful save creates exactly one version and one operation.
6. A repeated request ID cannot create another version.
7. A stale editor cannot overwrite a newer version.
8. Imported source columns cannot be removed; user-added columns can be edited
   and removed.
9. Downloads resolve to the current immutable version.
10. Every route is authenticated and ownership-scoped.
11. Hidden and sticky column preferences persist on the workbook session.

## 14. Minimum verification

- Accept valid `.xlsx` and `.xls` files; reject spoofed, corrupt, unsafe, and oversized files.
- Normalize Vietnamese and English header aliases.
- Allow sessions to continue when semantic price mappings are missing or
  ambiguous; preserve the selected-sheet choice.
- Create version 1 equal in content to the source.
- Keep two sessions from one source independent.
- Return stable pagination, search, sorting, and physical row identities.
- Add, edit, and remove user columns while preventing source-column removal.
- Persist hidden and sticky column preferences per session.
- Hide imported `No.`/`STT` columns by default.
- Display dates as `DD/MM/YYYY` and currency with the shared app formatter.
- Keep source and prior-version checksums unchanged after save.
- Create one version and operation for a successful request.
- Return the same result for an identical replay.
- Reject request-ID reuse with different content.
- Reject stale versions, invalid money, invalid rows, formulas, and merged cells.
- Enforce STAFF ownership and ADMIN access policy.
- Download bytes matching the current version checksum.
- Pass backend tests, frontend tests, type checking, linting, and local builds.

## 15. Implementation workstreams after approval

Shared schemas and contracts remain parent-owned. Agents receive non-overlapping
file ownership and completion criteria.

1. **Persistence and storage**
   - Models, enums, migration, settings, storage protocol, local implementation,
     hashing, safe paths, and atomic writes.
2. **Workbook reader and domain service**
   - Validation, sheet inspection, mapping, pagination/search/sort, and approved
     price mutation.
3. **API routes and OpenAPI**
   - Thin routes, auth/ownership, error mapping, upload/session/save/download,
     API tests, then schema export.
4. **Frontend data and shell**
   - Generated types, Zod boundary, RSC/client helpers, route, navigation,
     breadcrumbs, locales, loading/error boundaries.
5. **Frontend workbench**
   - Upload/session flow, TanStack Table, pricing rail, local drafts, explicit
     save, conflict/failure states, and download.
6. **Integration verification**
   - Cross-layer immutable-source, session-isolation, replay, conflict, and
     download flows plus full local verification.

Integration order:

```text
Contracts
   -> persistence/storage
   -> reader/service
   -> routes/OpenAPI
   -> frontend data layer
   -> shell and workbench
   -> end-to-end verification
```

Parallel work is allowed only where file ownership and contracts do not overlap.

## 16. Technical decisions

- **Business table, not spreadsheet:** TanStack Table provides controlled
  server-driven views; openpyxl remains the workbook engine.
- **Explicit save:** safer and smaller than autosave for the first release.
- **Full immutable snapshots:** straightforward recovery and audit behavior;
  storage optimization is deferred.
- **No cell database:** PostgreSQL stores identity, lifecycle, and audit only.
- **Automatic aliases only:** constrains MVP complexity and makes unsupported
  templates fail clearly.
- **Physical row identity:** remains stable across page/search/sort operations.
- **Local storage abstraction:** preserves a later Railway Volume migration
  without coupling services to filesystem paths.
- **Moderate workbook caps:** accepted trade-off for O(rows) server-side reads
  without premature indexing infrastructure.
- **Upload-and-library landing:** keeps new upload and persisted-session recovery
  together without mixing workbook data into Bay Buddy finance tables.
