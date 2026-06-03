"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileCheck2,
  FileText,
  ImageIcon,
  Inbox,
  Loader2,
  Mail,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"

import {
  uploadTicketImportAction,
} from "@/actions/ticket-imports"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  initialTicketImportActionState,
  type TicketImport,
  type TicketImportSource,
  type TicketImportStatus,
} from "@/schemas"

type TicketImportsWorkbenchProps = {
  initialImports: TicketImport[]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function sourceIcon(source: TicketImportSource) {
  return source === "INBOUND_EMAIL" ? Mail : UploadCloud
}

type PreviewImageSource = {
  blob: Blob
  extension: "png" | "svg"
  height: number
  width: number
}

type CropRect = {
  height: number
  width: number
  x: number
  y: number
}

type CropImageSource = PreviewImageSource & {
  url: string
}

type CropHandle =
  | "move"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw"

type CropInteraction = {
  handle: CropHandle
  initialRect: CropRect
  start: {
    x: number
    y: number
  }
}

const FALLBACK_PREVIEW_WIDTH = 840
const FALLBACK_PREVIEW_HEIGHT = 1024
const MAX_PREVIEW_WIDTH = 1200
const MAX_PREVIEW_HEIGHT = 8000
const MIN_CROP_SIZE = 0.04
const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }
const CROP_HANDLES: Array<{
  className: string
  cursor: string
  handle: Exclude<CropHandle, "move">
}> = [
  {
    className: "-left-2 -top-2",
    cursor: "cursor-nwse-resize",
    handle: "nw",
  },
  {
    className: "left-1/2 -top-2 -translate-x-1/2",
    cursor: "cursor-ns-resize",
    handle: "n",
  },
  {
    className: "-right-2 -top-2",
    cursor: "cursor-nesw-resize",
    handle: "ne",
  },
  {
    className: "-right-2 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
    handle: "e",
  },
  {
    className: "-bottom-2 -right-2",
    cursor: "cursor-nwse-resize",
    handle: "se",
  },
  {
    className: "-bottom-2 left-1/2 -translate-x-1/2",
    cursor: "cursor-ns-resize",
    handle: "s",
  },
  {
    className: "-bottom-2 -left-2",
    cursor: "cursor-nesw-resize",
    handle: "sw",
  },
  {
    className: "-left-2 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
    handle: "w",
  },
]

function clampPreviewSize(value: number, fallback: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback
  }

  return Math.min(Math.ceil(value), max)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

function clampCropRect(rect: CropRect): CropRect {
  const width = Math.min(1, Math.max(MIN_CROP_SIZE, rect.width))
  const height = Math.min(1, Math.max(MIN_CROP_SIZE, rect.height))

  return {
    height,
    width,
    x: Math.min(1 - width, Math.max(0, rect.x)),
    y: Math.min(1 - height, Math.max(0, rect.y)),
  }
}

function getDefaultCropRect(source: PreviewImageSource): CropRect {
  return clampCropRect({
    height: Math.min(0.82, Math.max(0.08, 520 / source.height)),
    width: 0.88,
    x: 0.06,
    y: 0.02,
  })
}

function resizeCropRect(
  interaction: CropInteraction,
  point: {
    x: number
    y: number
  },
): CropRect {
  const { handle, initialRect, start } = interaction
  const dx = point.x - start.x
  const dy = point.y - start.y

  if (handle === "move") {
    return clampCropRect({
      ...initialRect,
      x: initialRect.x + dx,
      y: initialRect.y + dy,
    })
  }

  let left = initialRect.x
  let right = initialRect.x + initialRect.width
  let top = initialRect.y
  let bottom = initialRect.y + initialRect.height

  if (handle.includes("w")) {
    left = Math.min(clampUnit(initialRect.x + dx), right - MIN_CROP_SIZE)
  }
  if (handle.includes("e")) {
    right = Math.max(
      clampUnit(initialRect.x + initialRect.width + dx),
      left + MIN_CROP_SIZE,
    )
  }
  if (handle.includes("n")) {
    top = Math.min(clampUnit(initialRect.y + dy), bottom - MIN_CROP_SIZE)
  }
  if (handle.includes("s")) {
    bottom = Math.max(
      clampUnit(initialRect.y + initialRect.height + dy),
      top + MIN_CROP_SIZE,
    )
  }

  left = clampUnit(left)
  right = clampUnit(right)
  top = clampUnit(top)
  bottom = clampUnit(bottom)

  if (right - left < MIN_CROP_SIZE) {
    if (handle.includes("w")) {
      left = Math.max(0, right - MIN_CROP_SIZE)
    } else {
      right = Math.min(1, left + MIN_CROP_SIZE)
    }
  }

  if (bottom - top < MIN_CROP_SIZE) {
    if (handle.includes("n")) {
      top = Math.max(0, bottom - MIN_CROP_SIZE)
    } else {
      bottom = Math.min(1, top + MIN_CROP_SIZE)
    }
  }

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  }
}

function serializePreviewDocument(
  documentSource: Document | null,
  fallbackHtml: string,
): string {
  const parsedDocument =
    documentSource ?? new DOMParser().parseFromString(fallbackHtml, "text/html")
  const clonedRoot = parsedDocument.documentElement.cloneNode(true) as HTMLElement

  clonedRoot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml")
  clonedRoot
    .querySelectorAll("script,iframe,object,embed,form,input,button,textarea,select")
    .forEach((node) => node.remove())

  return new XMLSerializer().serializeToString(clonedRoot)
}

function getPreviewSize(documentSource: Document | null): {
  height: number
  width: number
} {
  const root = documentSource?.documentElement
  const body = documentSource?.body
  const width = clampPreviewSize(
    Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0),
    FALLBACK_PREVIEW_WIDTH,
    MAX_PREVIEW_WIDTH,
  )
  const height = clampPreviewSize(
    Math.max(root?.scrollHeight ?? 0, body?.scrollHeight ?? 0),
    FALLBACK_PREVIEW_HEIGHT,
    MAX_PREVIEW_HEIGHT,
  )

  return { height, width }
}

function buildSvgImageBlob(htmlMarkup: string, width: number, height: number): Blob {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    ${htmlMarkup}
  </foreignObject>
</svg>`

  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Unable to render preview image."))
    image.src = url
  })
}

async function renderSvgToPng(
  svgBlob: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  const url = URL.createObjectURL(svgBlob)
  try {
    const image = await loadImage(url)
    const scale = Math.max(
      1,
      Math.min(window.devicePixelRatio || 1, 2, 12000 / Math.max(width, height)),
    )
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Canvas is unavailable.")
    }

    context.scale(scale, scale)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error("Unable to create PNG image."))
      }, "image/png")
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function cropImageSourceToPng(
  source: CropImageSource,
  crop: CropRect,
): Promise<Blob> {
  const image = await loadImage(source.url)
  const naturalWidth = image.naturalWidth || source.width
  const naturalHeight = image.naturalHeight || source.height
  const sx = Math.round(crop.x * naturalWidth)
  const sy = Math.round(crop.y * naturalHeight)
  const sWidth = Math.max(1, Math.round(crop.width * naturalWidth))
  const sHeight = Math.max(1, Math.round(crop.height * naturalHeight))
  const canvas = document.createElement("canvas")

  canvas.width = sWidth
  canvas.height = sHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas is unavailable.")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, sWidth, sHeight)
  context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error("Unable to create cropped image."))
    }, "image/png")
  })
}

function SubmitButton() {
  const t = useI18n()
  const { pending } = useFormStatus()

  return (
    <Button className="w-full sm:w-auto" disabled={pending} type="submit">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {pending
        ? t("ticketImports.actions.uploading")
        : t("ticketImports.actions.upload")}
    </Button>
  )
}

function StatusChip({ status }: { status: TicketImportStatus }) {
  const t = useI18n()
  const tone = {
    READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700",
    CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
  }[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      {t(`ticketImports.statuses.${status}`)}
    </span>
  )
}

export function TicketImportsWorkbench({
  initialImports,
}: TicketImportsWorkbenchProps) {
  const t = useI18n()
  const router = useRouter()
  const [state, formAction] = useActionState(
    uploadTicketImportAction,
    initialTicketImportActionState,
  )
  const [selectedImportId, setSelectedImportId] = React.useState(
    initialImports[0]?.id ?? null,
  )
  const [selectedFileName, setSelectedFileName] = React.useState("")
  const [imageAction, setImageAction] = React.useState<
    "copy" | "export" | "prepare" | null
  >(null)
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false)
  const [cropInteraction, setCropInteraction] =
    React.useState<CropInteraction | null>(null)
  const [cropImage, setCropImage] = React.useState<CropImageSource | null>(null)
  const [cropRect, setCropRect] = React.useState<CropRect>(FULL_CROP)
  const previewFrameRef = React.useRef<HTMLIFrameElement>(null)
  const cropImageRef = React.useRef<HTMLImageElement>(null)

  const selectedImport =
    initialImports.find((ticketImport) => ticketImport.id === selectedImportId) ??
    initialImports[0] ??
    null

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setSelectedFileName("")
      if (state.importId) {
        setSelectedImportId(state.importId)
      }
      router.refresh()
    }

    if (state.status === "error") {
      toast.error(state.message ?? t("ticketImports.actions.uploadFailure"))
    }
  }, [router, state.importId, state.message, state.status, t])

  React.useEffect(() => {
    if (!selectedImportId && initialImports[0]) {
      setSelectedImportId(initialImports[0].id)
    }
  }, [initialImports, selectedImportId])

  React.useEffect(() => {
    return () => {
      if (cropImage?.url) {
        URL.revokeObjectURL(cropImage.url)
      }
    }
  }, [cropImage?.url])

  React.useEffect(() => {
    setCropDialogOpen(false)
    setCropInteraction(null)
    setCropImage(null)
    setCropRect(FULL_CROP)
  }, [selectedImport?.id])

  const readyCount = initialImports.filter(
    (ticketImport) => ticketImport.status === "READY",
  ).length
  const emailCount = initialImports.filter(
    (ticketImport) => ticketImport.source === "INBOUND_EMAIL",
  ).length
  const uploadCount = initialImports.filter(
    (ticketImport) => ticketImport.source === "UPLOAD",
  ).length

  const getPreviewDocument = () => {
    if (!selectedImport?.redacted_content) {
      return null
    }

    const frame = previewFrameRef.current
    if (!frame || frame.srcdoc !== selectedImport.redacted_content) {
      return null
    }

    try {
      return frame.contentDocument
    } catch {
      return null
    }
  }

  const buildPreviewImageSource = async (): Promise<PreviewImageSource> => {
    if (!selectedImport?.redacted_content) {
      throw new Error("No preview content.")
    }

    const previewDocument = getPreviewDocument()
    const { height, width } = getPreviewSize(previewDocument)
    const htmlMarkup = serializePreviewDocument(
      previewDocument,
      selectedImport.redacted_content,
    )
    const svgBlob = buildSvgImageBlob(htmlMarkup, width, height)

    try {
      const pngBlob = await renderSvgToPng(svgBlob, width, height)
      return { blob: pngBlob, extension: "png", height, width }
    } catch {
      return { blob: svgBlob, extension: "svg", height, width }
    }
  }

  const buildPreviewPng = async (): Promise<Blob> => {
    if (!selectedImport?.redacted_content) {
      throw new Error("No preview content.")
    }

    const previewDocument = getPreviewDocument()
    const { height, width } = getPreviewSize(previewDocument)
    const htmlMarkup = serializePreviewDocument(
      previewDocument,
      selectedImport.redacted_content,
    )
    const svgBlob = buildSvgImageBlob(htmlMarkup, width, height)
    return renderSvgToPng(svgBlob, width, height)
  }

  const openExportCropDialog = async () => {
    if (!selectedImport?.redacted_content || imageAction) {
      return
    }

    setImageAction("prepare")
    try {
      const imageSource = await buildPreviewImageSource()
      setCropImage({
        ...imageSource,
        url: URL.createObjectURL(imageSource.blob),
      })
      setCropRect(getDefaultCropRect(imageSource))
      setCropInteraction(null)
      setCropDialogOpen(true)
    } catch {
      toast.error(t("ticketImports.actions.downloadImageFailure"))
    } finally {
      setImageAction(null)
    }
  }

  const exportCroppedImage = async () => {
    if (!selectedImport || !cropImage || imageAction) {
      return
    }

    setImageAction("export")
    try {
      const pngBlob = await cropImageSourceToPng(cropImage, cropRect)
      downloadBlob(pngBlob, `bay-buddy-edited-ticket-${selectedImport.id}.png`)
      toast.success(t("ticketImports.actions.downloadImageSuccess"))
      setCropDialogOpen(false)
    } catch {
      if (cropImage.extension === "svg") {
        downloadBlob(
          cropImage.blob,
          `bay-buddy-edited-ticket-${selectedImport.id}.svg`,
        )
        toast.success(t("ticketImports.actions.downloadImageFallback"))
        setCropDialogOpen(false)
        return
      }

      toast.error(t("ticketImports.actions.downloadImageFailure"))
    } finally {
      setImageAction(null)
    }
  }

  const copyImage = async () => {
    if (!selectedImport?.redacted_content || imageAction) {
      return
    }

    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      toast.error(t("ticketImports.actions.copyImageUnsupported"))
      return
    }

    setImageAction("copy")
    try {
      const pngBlob = await buildPreviewPng()
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": pngBlob,
        }),
      ])
      toast.success(t("ticketImports.actions.copyImageSuccess"))
    } catch {
      toast.error(t("ticketImports.actions.copyImageFailure"))
    } finally {
      setImageAction(null)
    }
  }

  const getCropPointerPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const image = cropImageRef.current
    if (!image) {
      return null
    }

    const bounds = image.getBoundingClientRect()
    if (!bounds.width || !bounds.height) {
      return null
    }

    return {
      x: clampUnit((event.clientX - bounds.left) / bounds.width),
      y: clampUnit((event.clientY - bounds.top) / bounds.height),
    }
  }

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getCropPointerPosition(event)
    if (!point) {
      return
    }

    const handleElement = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-crop-handle]",
    )
    const handle = handleElement?.dataset.cropHandle as CropHandle | undefined
    if (!handle) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setCropInteraction({
      handle,
      initialRect: cropRect,
      start: point,
    })
  }

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropInteraction) {
      return
    }

    const point = getCropPointerPosition(event)
    if (!point) {
      return
    }

    setCropRect(resizeCropRect(cropInteraction, point))
  }

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setCropInteraction(null)
  }

  const clearCropDrag = () => {
    setCropInteraction(null)
  }

  const handleCropDialogOpenChange = (open: boolean) => {
    setCropDialogOpen(open)
    if (!open) {
      setCropInteraction(null)
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden pb-12 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("ticketImports.eyebrow")}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.02em]">
            {t("ticketImports.title")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("ticketImports.description")}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        {[
          [FileCheck2, t("ticketImports.metrics.ready"), readyCount],
          [Mail, t("ticketImports.metrics.forwarded"), emailCount],
          [UploadCloud, t("ticketImports.metrics.uploads"), uploadCount],
        ].map(([Icon, label, value]) => {
          const MetricIcon = Icon as React.ComponentType<{ className?: string }>
          return (
            <div
              className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              key={label as string}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                <MetricIcon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {label as string}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                {value as number}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 2xl:sticky 2xl:top-20 2xl:self-start">
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="border-b border-border px-5 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {t("ticketImports.upload.eyebrow")}
              </p>
            </div>
            <form action={formAction} className="space-y-4 p-4 xl:p-5">
              <label
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 px-4 py-6 text-center transition-colors hover:border-primary/35 hover:bg-accent/45"
              >
                <UploadCloud
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="mt-3 text-sm font-medium text-foreground">
                  {selectedFileName || t("ticketImports.upload.choose")}
                </span>
                <span className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("ticketImports.upload.hint")}
                </span>
                <input
                  accept=".eml,.html,.htm,text/html,message/rfc822"
                  className="sr-only"
                  name="file"
                  onChange={(event) =>
                    setSelectedFileName(event.target.files?.[0]?.name ?? "")
                  }
                  type="file"
                />
              </label>

              {state.fieldErrors.file ? (
                <p className="text-sm text-red-600" role="alert">
                  {state.fieldErrors.file}
                </p>
              ) : null}

              <SubmitButton />

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm leading-6 text-blue-800">
                {t("ticketImports.forwardingHint")}
              </div>
            </form>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {t("ticketImports.queue.eyebrow")}
              </p>
              <span className="text-xs text-muted-foreground">
                {t("ticketImports.queue.count", { count: initialImports.length })}
              </span>
            </div>

            {initialImports.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
                  <Inbox className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("ticketImports.queue.empty")}
                </p>
              </div>
            ) : (
              <div className="max-h-[45vh] overflow-y-auto md:max-h-[420px]">
                <div className="border-b border-border bg-secondary/40 px-5 py-3.5">
                  <p className="text-sm text-muted-foreground">
                    {t("ticketImports.queue.item")}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {initialImports.map((ticketImport) => {
                    const Icon = sourceIcon(ticketImport.source)
                    const isSelected = ticketImport.id === selectedImport?.id
                    return (
                      <button
                        className={cn(
                          "flex w-full min-w-0 items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/45",
                          isSelected && "bg-accent/55",
                        )}
                        key={ticketImport.id}
                        onClick={() => setSelectedImportId(ticketImport.id)}
                        type="button"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-primary">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {ticketImport.subject ||
                              ticketImport.original_filename ||
                              t("ticketImports.queue.untitled")}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {t(`ticketImports.sources.${ticketImport.source}`)} ·{" "}
                            {formatDate(ticketImport.created_at)}
                          </p>
                          <span className="mt-2 inline-flex">
                            <StatusChip status={ticketImport.status} />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("ticketImports.preview.eyebrow")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!selectedImport?.redacted_content || imageAction !== null}
                onClick={copyImage}
                size="sm"
                type="button"
                variant="outline"
              >
                {imageAction === "copy" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t("ticketImports.actions.copyImage")}
              </Button>
              <Button
                disabled={!selectedImport?.redacted_content || imageAction !== null}
                onClick={openExportCropDialog}
                size="sm"
                type="button"
              >
                {imageAction === "prepare" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t("ticketImports.actions.downloadImage")}
              </Button>
            </div>
          </div>

          {selectedImport ? (
            <div className="min-w-0 space-y-4 p-4 xl:p-5">
              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-secondary/45 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t("ticketImports.preview.source")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {t(`ticketImports.sources.${selectedImport.source}`)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/45 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t("ticketImports.preview.createdAt")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(selectedImport.created_at)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/45 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t("ticketImports.preview.redaction")}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    {t("ticketImports.preview.redactionReady")}
                  </p>
                </div>
              </div>

              {selectedImport.failure_reason ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  {selectedImport.failure_reason}
                </div>
              ) : null}

              <div className="max-w-full overflow-hidden rounded-xl border border-border bg-secondary">
                {selectedImport.redacted_content ? (
                  <iframe
                    className="h-[640px] w-full bg-white md:h-[calc(100vh-12rem)] md:min-h-[520px]"
                    ref={previewFrameRef}
                    referrerPolicy="no-referrer"
                    sandbox="allow-same-origin"
                    srcDoc={selectedImport.redacted_content}
                    title={t("ticketImports.preview.frameTitle")}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("ticketImports.preview.empty")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("ticketImports.preview.noSelection")}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={cropDialogOpen} onOpenChange={handleCropDialogOpenChange}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,76rem)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 pr-14">
            <DialogTitle>{t("ticketImports.crop.title")}</DialogTitle>
            <DialogDescription>
              {t("ticketImports.crop.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:overflow-hidden xl:p-5">
            {cropImage ? (
              <>
                <div className="max-h-[58vh] min-h-0 overflow-auto overscroll-contain rounded-xl border border-border bg-secondary p-3 lg:max-h-[calc(92vh-13rem)]">
                  <div
                    aria-label={t("ticketImports.crop.imageAlt")}
                    className="relative mx-auto w-fit touch-none select-none"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerCancel={clearCropDrag}
                    onPointerUp={handleCropPointerUp}
                    onLostPointerCapture={clearCropDrag}
                    role="img"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL previews need native image dimensions for canvas cropping. */}
                    <img
                      alt={t("ticketImports.crop.imageAlt")}
                      className="block max-w-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      draggable={false}
                      ref={cropImageRef}
                      src={cropImage.url}
                    />
                    <div
                      className="pointer-events-none absolute bg-primary/10 shadow-[0_0_0_9999px_rgba(24,29,38,0.22)]"
                      style={{
                        height: `${cropRect.height * 100}%`,
                        left: `${cropRect.x * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.width * 100}%`,
                      }}
                    />
                    <div
                      className="absolute cursor-move border-2 border-primary"
                      data-crop-handle="move"
                      style={{
                        height: `${cropRect.height * 100}%`,
                        left: `${cropRect.x * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.width * 100}%`,
                      }}
                    >
                      {CROP_HANDLES.map((handle) => (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute h-4 w-4 rounded-full border-2 border-white bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.18)]",
                            handle.className,
                            handle.cursor,
                          )}
                          data-crop-handle={handle.handle}
                          key={handle.handle}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-border bg-white p-4 lg:max-h-[calc(92vh-13rem)]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {t("ticketImports.crop.selection")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t("ticketImports.crop.instructions")}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/55 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {t("ticketImports.crop.cropSize")}
                    </p>
                    <p className="mt-1 font-mono text-sm font-medium text-foreground">
                      {Math.round(cropRect.width * cropImage.width)} x{" "}
                      {Math.round(cropRect.height * cropImage.height)} px
                    </p>
                  </div>

                  <Button
                    className="mt-auto"
                    onClick={() => setCropRect(FULL_CROP)}
                    type="button"
                    variant="outline"
                  >
                    {t("ticketImports.crop.reset")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="col-span-full flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-secondary text-center">
                <Loader2
                  className="h-6 w-6 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  {t("ticketImports.crop.loading")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button
              onClick={() => handleCropDialogOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t("ticketImports.crop.cancel")}
            </Button>
            <Button
              disabled={!cropImage || imageAction !== null}
              onClick={exportCroppedImage}
              type="button"
            >
              {imageAction === "export" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t("ticketImports.crop.export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
