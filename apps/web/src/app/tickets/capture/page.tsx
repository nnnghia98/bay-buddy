"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as z from "zod";
import {
  Plus,
  Trash2,
  Wand2,
  UploadCloud,
  FileText,
  X,
  Loader2,
} from "lucide-react";

import {
  CommandPanel,
  CommandPanelHeader,
} from "@/components/command-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const passengerSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const ticketSchema = z.object({
  customerName: z.string().min(1, "Customer Name is required"),
  pnr: z.string().min(1, "PNR is required"),
  airline: z.string().min(1, "Airline is required"),
  ticketNumber: z.string().min(1, "Ticket Number is required"),
  flightDate: z.string().min(1, "Flight Date is required"),
  passengers: z
    .array(passengerSchema)
    .min(1, "At least one passenger is required"),
  departurePlace: z.string().min(1, "Departure Place is required"),
  arrivalPlace: z.string().min(1, "Arrival Place is required"),
  departureCode: z.string().min(1, "Departure Code is required"),
  arrivalCode: z.string().min(1, "Arrival Code is required"),
  route: z.string().min(1, "Route is required"),
  totalPrice: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Must be a positive number"),
  ),
});

type TicketFormValues = {
  customerName: string;
  pnr: string;
  airline: string;
  ticketNumber: string;
  flightDate: string;
  passengers: { name: string }[];
  departurePlace: string;
  arrivalPlace: string;
  departureCode: string;
  arrivalCode: string;
  route: string;
  totalPrice: number;
};

// ---------------------------------------------------------------------------
// API response type (matches backend ParseFlightResponse)
// ---------------------------------------------------------------------------

interface ParsedFlightData {
  pnr: string;
  airline: string;
  ticket_number: string;
  passengers: string[];
  departure_place: string;
  arrival_place: string;
  departure_code: string;
  arrival_code: string;
  itinerary: string;
  flight_date: string;
  net_price: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

async function parseFileWithAI(file: File): Promise<ParsedFlightData> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<ParsedFlightData>("/ai/parse", {
    method: "POST",
    body: formData,
  });
}

async function saveTicket(data: TicketFormValues) {
  const payload = {
    customer_name: data.customerName,
    pnr: data.pnr,
    airline: data.airline,
    ticket_number: data.ticketNumber,
    passengers: data.passengers.map((p) => p.name),
    departure_place: data.departurePlace,
    arrival_place: data.arrivalPlace,
    departure_code: data.departureCode.toUpperCase(),
    arrival_code: data.arrivalCode.toUpperCase(),
    itinerary: data.route,
    flight_date: new Date(data.flightDate).toISOString(),
    net_price: data.totalPrice,
  };

  return apiFetch("/tickets/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CaptureTicketPage() {
  const router = useRouter();
  const { token, isReady, logout } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [isReady, router, token]);

  const form = useForm<TicketFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ticketSchema) as any,
    defaultValues: {
      customerName: "",
      pnr: "",
      airline: "",
      ticketNumber: "",
      flightDate: "",
      passengers: [{ name: "" }],
      departurePlace: "",
      arrivalPlace: "",
      departureCode: "",
      arrivalCode: "",
      route: "",
      totalPrice: 0,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  const departureCode = useWatch({
    control: form.control,
    name: "departureCode",
  });
  const arrivalCode = useWatch({
    control: form.control,
    name: "arrivalCode",
  });

  React.useEffect(() => {
    const normalizedDepartureCode = departureCode?.trim().toUpperCase();
    const normalizedArrivalCode = arrivalCode?.trim().toUpperCase();

    if (!normalizedDepartureCode || !normalizedArrivalCode) {
      return;
    }

    form.setValue("route", `${normalizedDepartureCode}-${normalizedArrivalCode}`, {
      shouldDirty: true,
    });
  }, [arrivalCode, departureCode, form]);

  // ---------- File handling ----------

  const handleFile = (incoming: File) => {
    setFile(incoming);

    // Revoke old preview to avoid memory leaks
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (incoming.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(incoming));
    } else {
      setPreviewUrl(null); // PDF – no image preview
    }
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---------- Drag-and-drop ----------

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  // ---------- TanStack useMutation ----------

  const mutation = useMutation({
    mutationFn: parseFileWithAI,
    onSuccess: (data) => {
      form.setValue("pnr", data.pnr);
      form.setValue("airline", data.airline);
      form.setValue("ticketNumber", data.ticket_number);
      form.setValue("departurePlace", data.departure_place);
      form.setValue("arrivalPlace", data.arrival_place);
      form.setValue("departureCode", data.departure_code);
      form.setValue("arrivalCode", data.arrival_code);
      form.setValue("route", data.itinerary);

      const dateStr = data.flight_date ? data.flight_date.slice(0, 16) : "";
      form.setValue("flightDate", dateStr);

      form.setValue("totalPrice", data.net_price);
      replace(data.passengers.map((name) => ({ name })));
    },
  });

  const handleParseWithAI = () => {
    if (file) mutation.mutate(file);
  };

  // ---------- Form submit ----------

  const saveMutation = useMutation({
    mutationFn: saveTicket,
    onSuccess: () => {
      toast.success("Đã lưu vé và ghi nhận công nợ.");
      // router.push("/tickets");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        router.replace("/login");
      }
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TicketFormValues) => {
    saveMutation.mutate(data);
  };

  const isImage = file?.type.startsWith("image/");
  const isPDF = file?.type === "application/pdf";

  if (!isReady || !token) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow="Ticket Capture"
          title="Nhập vé bằng AI từ booking confirmation hoặc e-ticket PDF."
          description="Tải chứng từ lên, trích xuất dữ liệu chuyến bay với Gemini và kiểm tra lại trước khi lưu để tạo phát sinh công nợ cho khách hàng."
        />

        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 lg:items-start">
          {/* ---------------------------------------------------------------- */}
          {/* Left column – File upload / Preview                              */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-base font-medium text-foreground">
                Chứng từ đặt chỗ
              </Label>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Hỗ trợ ảnh JPEG, PNG, WebP hoặc file PDF e-ticket.
              </p>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload ticket file"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) =>
                e.key === "Enter" && fileInputRef.current?.click()
              }
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "relative flex min-h-[300px] cursor-pointer select-none flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                isDragging
                  ? "border-primary bg-accent/65"
                  : "border-border bg-secondary hover:border-primary/35 hover:bg-accent/45",
              )}
            >
              {/* Preview area */}
              {isImage && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Ticket preview"
                  className="max-h-72 max-w-full rounded-lg object-contain p-2"
                />
              ) : isPDF ? (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <FileText
                    className="h-16 w-16 text-primary"
                    strokeWidth={1.5}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {file!.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(file!.size / 1024).toFixed(1)} KB - PDF document
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                  <UploadCloud className="h-12 w-12" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Kéo thả hoặc bấm để tải file lên
                    </p>
                    <p className="mt-1 text-xs">JPEG, PNG, WebP hoặc PDF</p>
                  </div>
                </div>
              )}
            </div>

            {/* File info bar + Clear button */}
            {file && (
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-3 text-sm">
                <span className="max-w-[80%] truncate text-foreground">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-2 shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white hover:text-red-500"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Error from mutation */}
            {mutation.isError && (
              <p className="text-sm text-red-500">
                {(mutation.error as Error).message}
              </p>
            )}

            {/* Parse button */}
            <Button
              id="parse-with-ai-btn"
              onClick={handleParseWithAI}
              className="mt-1 w-full justify-center"
              size="lg"
              disabled={!file || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Trích xuất bằng AI
                </>
              )}
            </Button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right column – React Hook Form                                   */}
          {/* ---------------------------------------------------------------- */}
          <form
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-base font-medium tracking-[-0.02em] text-foreground">
                Thông tin vé
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Kiểm tra lại dữ liệu trích xuất trước khi xác nhận lưu vào hệ thống.
              </p>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Tên khách hàng</Label>
              <Input
                id="customerName"
                placeholder="Ví dụ: Nguyen Van A"
                {...form.register("customerName")}
              />
              {form.formState.errors.customerName && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.customerName.message}
                </p>
              )}
            </div>

            {/* PNR + Airline row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pnr">PNR / Mã đặt chỗ</Label>
                <Input
                  id="pnr"
                  placeholder="Ví dụ: XYZ987"
                  {...form.register("pnr")}
                />
                {form.formState.errors.pnr && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.pnr.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="airline">Hãng bay</Label>
                <Input
                  id="airline"
                  placeholder="Ví dụ: VNA"
                  {...form.register("airline")}
                />
                {form.formState.errors.airline && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.airline.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketNumber">Số vé</Label>
              <Input
                id="ticketNumber"
                placeholder="Ví dụ: 7382319992101"
                {...form.register("ticketNumber")}
              />
              {form.formState.errors.ticketNumber && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.ticketNumber.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departurePlace">Nơi đi</Label>
                <Input
                  id="departurePlace"
                  placeholder="Ví dụ: Da Nang City"
                  {...form.register("departurePlace")}
                />
                {form.formState.errors.departurePlace && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.departurePlace.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrivalPlace">Nơi đến</Label>
                <Input
                  id="arrivalPlace"
                  placeholder="Ví dụ: Ho Chi Minh City"
                  {...form.register("arrivalPlace")}
                />
                {form.formState.errors.arrivalPlace && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.arrivalPlace.message}
                  </p>
                )}
              </div>
            </div>

            {/* Route & Date */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="departureCode">Mã nơi đi</Label>
                <Input
                  id="departureCode"
                  placeholder="Ví dụ: DAD"
                  {...form.register("departureCode")}
                />
                {form.formState.errors.departureCode && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.departureCode.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrivalCode">Mã nơi đến</Label>
                <Input
                  id="arrivalCode"
                  placeholder="Ví dụ: SGN"
                  {...form.register("arrivalCode")}
                />
                {form.formState.errors.arrivalCode && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.arrivalCode.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="route">Hành trình</Label>
                <Input
                  id="route"
                  placeholder="Ví dụ: SGN-HAN"
                  readOnly
                  {...form.register("route")}
                />
                {form.formState.errors.route && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.route.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="flightDate">Ngày bay</Label>
                <Input
                  id="flightDate"
                  type="datetime-local"
                  {...form.register("flightDate")}
                />
                {form.formState.errors.flightDate && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.flightDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Total Price */}
            <div className="space-y-2">
              <Label htmlFor="totalPrice">Giá gốc (VND)</Label>
              <Input
                id="totalPrice"
                type="number"
                min={0}
                placeholder="0"
                {...form.register("totalPrice")}
              />
              {form.formState.errors.totalPrice && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.totalPrice.message}
                </p>
              )}
            </div>

            {/* Passengers */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label>Hành khách</Label>
                <Button
                  type="button"
                  id="add-passenger-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "" })}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Thêm
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      id={`passenger-${index}`}
                      placeholder={`Tên hành khách ${index + 1}`}
                      {...form.register(`passengers.${index}.name`)}
                    />
                    {form.formState.errors.passengers?.[index]?.name && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.passengers[index]?.name?.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove passenger ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="mt-auto flex justify-end border-t border-border pt-4">
              <Button
                id="save-ticket-btn"
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu vé"
                )}
              </Button>
            </div>
          </form>
        </div>
      </CommandPanel>
    </div>
  );
}
