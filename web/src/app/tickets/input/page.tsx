"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  CheckCircle2,
  AlertCircle,
  Pencil,
  Lock,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApiError, apiFetch, apiFetchData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOGIN_PATH, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import {
  CustomerDirectoryItemSchema,
  type CustomerDirectoryItem,
} from "@/schemas";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const passengerSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên hành khách"),
});

const optionalTextField = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const moneyField = z.preprocess(
  (val) => Number(val),
  z.number().min(0, "Giá trị phải lớn hơn hoặc bằng 0"),
);

const formatVndInput = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const parseVndInput = (value: string, allowNegative = false): number => {
  const isNegative = allowNegative && value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  const parsed = digits ? Number(digits) : 0;

  return isNegative ? -parsed : parsed;
};

const ticketSchema = z.object({
  customerName: optionalTextField,
  pnr: optionalTextField,
  airline: z.string().min(1, "Hãng bay là bắt buộc"),
  ticketNumber: z.string().min(1, "Số vé là bắt buộc"),
  flightDate: optionalTextField,
  passengers: z
    .array(passengerSchema)
    .min(1, "Cần ít nhất 1 hành khách"),
  departurePlace: optionalTextField,
  arrivalPlace: optionalTextField,
  departureCode: optionalTextField,
  arrivalCode: optionalTextField,
  route: optionalTextField,
  totalPrice: moneyField,
  sellingPrice: moneyField,
  discount: moneyField,
  trueIncome: z.preprocess((val) => Number(val), z.number()),
}).refine(
  (data) => data.sellingPrice >= data.totalPrice,
  {
    message: "Giá bán phải lớn hơn hoặc bằng giá gốc",
    path: ["sellingPrice"],
  },
).refine(
  (data) => Math.abs(data.trueIncome - (data.sellingPrice + data.discount - data.totalPrice)) <= 1,
  {
    message: "Thu nhập thực phải bằng Giá bán + Chiết khấu hãng - Giá gốc",
    path: ["trueIncome"],
  },
);

type TicketFormValues = {
  customerName?: string;
  pnr?: string;
  airline: string;
  ticketNumber: string;
  flightDate?: string;
  passengers: { name: string }[];
  departurePlace?: string;
  arrivalPlace?: string;
  departureCode?: string;
  arrivalCode?: string;
  route?: string;
  totalPrice: number;
  sellingPrice: number;
  discount: number;
  trueIncome: number;
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

async function fetchCustomers(): Promise<CustomerDirectoryItem[]> {
  const payload = await apiFetchData<unknown>("/customers?limit=500");
  return z.array(CustomerDirectoryItemSchema).parse(payload);
}

async function saveTicket(data: TicketFormValues) {
  const firstPassengerName = data.passengers
    .map((passenger) => passenger.name.trim())
    .find(Boolean);
  const fallbackCodeFromTicket = data.ticketNumber.trim().slice(-6).toUpperCase().padStart(6, "X");
  const departureCode = data.departureCode?.trim().toUpperCase();
  const arrivalCode = data.arrivalCode?.trim().toUpperCase();
  const derivedItineraryFromCodes =
    departureCode && arrivalCode ? `${departureCode}-${arrivalCode}` : undefined;
  const itinerary = data.route?.trim().toUpperCase() || derivedItineraryFromCodes || "UNK-UNK";

  const payload = {
    customer_name: data.customerName?.trim() || firstPassengerName || "Unknown Passenger",
    pnr: data.pnr?.trim().toUpperCase() || fallbackCodeFromTicket,
    airline: data.airline,
    ticket_number: data.ticketNumber,
    passengers: data.passengers.map((p) => p.name),
    departure_place: data.departurePlace?.trim() || null,
    arrival_place: data.arrivalPlace?.trim() || null,
    departure_code: departureCode || null,
    arrival_code: arrivalCode || null,
    itinerary,
    flight_date: data.flightDate
      ? new Date(data.flightDate).toISOString()
      : new Date().toISOString(),
    net_price: data.totalPrice,
    ev_price: data.totalPrice,
    ast_price: 0,
    thf_price: 0,
    web_price: 0,
    insurance_price: 0,
    service_fee: data.sellingPrice - data.totalPrice,
    selling_price: data.sellingPrice,
    discount: data.discount,
    true_income: data.trueIncome,
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
  const [isTrueIncomeEditable, setIsTrueIncomeEditable] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace(LOGIN_PATH);
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
      sellingPrice: 0,
      discount: 0,
      trueIncome: 0,
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
  const watchedNetPrice = useWatch({
    control: form.control,
    name: "totalPrice",
  });
  const watchedSellingPrice = useWatch({
    control: form.control,
    name: "sellingPrice",
  });
  const watchedDiscount = useWatch({
    control: form.control,
    name: "discount",
  });
  const watchedTrueIncome = useWatch({
    control: form.control,
    name: "trueIncome",
  });
  const customersQuery = useQuery({
    queryKey: ["ticket-input-customers"],
    queryFn: fetchCustomers,
    enabled: isReady && Boolean(token),
  });
  const customerNameOptions = React.useMemo(() => {
    const names = customersQuery.data
      ?.map((customer) => customer.full_name.trim())
      .filter(Boolean) ?? [];

    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b, "vi", { sensitivity: "base" }),
    );
  }, [customersQuery.data]);

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

  React.useEffect(() => {
    if (isTrueIncomeEditable) {
      return;
    }

    const netPrice = Number(watchedNetPrice) || 0;
    const sellingPrice = Number(watchedSellingPrice) || 0;
    const discount = Number(watchedDiscount) || 0;

    form.setValue("trueIncome", sellingPrice + discount - netPrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, isTrueIncomeEditable, watchedDiscount, watchedNetPrice, watchedSellingPrice]);

  const handleToggleTrueIncomeEdit = () => {
    setIsTrueIncomeEditable((current) => {
      if (current) {
        const netPrice = Number(form.getValues("totalPrice")) || 0;
        const sellingPrice = Number(form.getValues("sellingPrice")) || 0;
        const discount = Number(form.getValues("discount")) || 0;

        form.setValue("trueIncome", sellingPrice + discount - netPrice, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      return !current;
    });
  };

  const handleMoneyChange = (
    field: "totalPrice" | "sellingPrice" | "discount",
    value: string,
  ) => {
    form.setValue(field, parseVndInput(value), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleTrueIncomeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTrueIncomeEditable) {
      return;
    }

    const trueIncome = parseVndInput(event.target.value, true);
    const netPrice = Number(form.getValues("totalPrice")) || 0;
    const discount = Number(form.getValues("discount")) || 0;

    form.setValue("trueIncome", trueIncome, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("sellingPrice", trueIncome + netPrice - discount, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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

  // ---------- Paste handling ----------

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore if user is currently typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/") || item.type === "application/pdf") {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            handleFile(pastedFile);
            e.preventDefault();
            break;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

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
      form.setValue("sellingPrice", data.net_price);
      form.setValue("discount", 0);
      form.setValue("trueIncome", 0);
      replace(data.passengers.map((name) => ({ name })));
      
      toast.success("Đã trích xuất dữ liệu thành công. Vui lòng kiểm tra lại.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        router.replace(SESSION_EXPIRED_LOGIN_PATH);
        return;
      }
      toast.error(error.message || "Lỗi khi trích xuất dữ liệu");
    }
  });

  const handleParseWithAI = () => {
    if (file) mutation.mutate(file);
  };

  // ---------- Form submit ----------

  const saveMutation = useMutation({
    mutationFn: saveTicket,
    onSuccess: () => {
      toast.success("Đã lưu vé và ghi nhận công nợ.");
      form.reset();
      clearFile();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        router.replace(SESSION_EXPIRED_LOGIN_PATH);
        return;
      }
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TicketFormValues) => {
    saveMutation.mutate(data);
  };

  const isImage = file?.type.startsWith("image/");
  const isPDF = file?.type === "application/pdf";
  const hasExtractedData = mutation.isSuccess;

  if (!isReady || !token) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4 pb-12">
      <div className="grid min-w-0 grid-cols-1 gap-8 p-4 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[450px_minmax(0,1fr)]">
          {/* ---------------------------------------------------------------- */}
          {/* Left column – File upload / Preview (Sticky)                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-4 xl:sticky xl:top-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Chứng từ đặt chỗ</CardTitle>
                <CardDescription>Hỗ trợ ảnh JPEG, PNG, WebP hoặc file PDF e-ticket.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
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
                    "relative flex min-h-[320px] cursor-pointer select-none flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors overflow-hidden",
                    isDragging
                      ? "border-primary bg-accent/65"
                      : "border-border bg-secondary/50 hover:border-primary/35 hover:bg-accent/45",
                  )}
                >
                  {/* Preview area */}
                  {isImage && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Ticket preview"
                      className="w-full h-full object-contain p-2 absolute inset-0 m-auto"
                    />
                  ) : isPDF ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                      <FileText
                        className="h-16 w-16 text-primary/80"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-medium text-foreground text-center px-4 truncate max-w-full">
                        {file!.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(file!.size / 1024).toFixed(1)} KB - PDF document
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                      <UploadCloud className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Kéo thả, dán (Ctrl+V) hoặc bấm để tải file
                        </p>
                        <p className="mt-1 text-xs">JPEG, PNG, WebP hoặc PDF</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Parsing Overlay */}
                  {mutation.isPending && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                      <p className="text-sm font-medium">AI đang trích xuất dữ liệu...</p>
                      <p className="text-xs text-muted-foreground mt-1">Quá trình này có thể mất vài giây</p>
                    </div>
                  )}
                </div>

                {/* File info bar + Clear button */}
                {file && !mutation.isPending && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-foreground font-medium">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Parse button */}
                <Button
                  id="parse-with-ai-btn"
                  onClick={handleParseWithAI}
                  className="w-full"
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
                      Nhập vé
                    </>
                  )}
                </Button>

                {hasExtractedData && (
                  <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800 border border-green-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                    <p>Dữ liệu đã được trích xuất. Vui lòng kiểm tra và chỉnh sửa nếu cần trước khi lưu.</p>
                  </div>
                )}
                
                {mutation.isError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800 border border-red-100">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                    <p>{(mutation.error as Error).message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right column – React Hook Form                                   */}
          {/* ---------------------------------------------------------------- */}
          <form
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="flex min-w-0 flex-col gap-6"
          >
            {/* Customer & Price Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Thông tin giao dịch</CardTitle>
                <CardDescription>Khách hàng thanh toán và giá trị vé (công nợ sẽ được ghi nhận cho khách hàng này).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-semibold text-foreground">Tên khách hàng</Label>
                  <Input
                    id="customerName"
                    list="customerNameOptions"
                    placeholder="Ví dụ: Nguyen Van A"
                    className={cn("h-11", hasExtractedData && "border-primary/20 bg-primary/5")}
                    {...form.register("customerName")}
                  />
                  <datalist id="customerNameOptions">
                    {customerNameOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {form.formState.errors.customerName && (
                    <p className="text-xs text-red-500 font-medium">
                      {form.formState.errors.customerName.message}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="totalPrice" className="text-sm font-semibold text-foreground">Giá gốc <span className="text-red-500">*</span></Label>
                      <div className="space-y-1">
                        <div className="relative">
                        <Input
                          id="totalPrice"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={cn("h-11 bg-background pr-14 text-right font-semibold", hasExtractedData && "border-primary/20 bg-primary/5")}
                          value={formatVndInput(Number(watchedNetPrice) || 0)}
                          onChange={(event) => handleMoneyChange("totalPrice", event.target.value)}
                        />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            VND
                          </span>
                        </div>
                        {form.formState.errors.totalPrice && (
                          <p className="text-xs font-medium text-red-500">
                            {form.formState.errors.totalPrice.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="sellingPrice" className="text-sm font-semibold text-foreground">Giá bán <span className="text-red-500">*</span></Label>
                      <div className="space-y-1">
                        <div className="relative">
                        <Input
                          id="sellingPrice"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className="h-11 bg-background pr-14 text-right font-semibold"
                          value={formatVndInput(Number(watchedSellingPrice) || 0)}
                          onChange={(event) => handleMoneyChange("sellingPrice", event.target.value)}
                        />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            VND
                          </span>
                        </div>
                        {form.formState.errors.sellingPrice && (
                          <p className="text-xs font-medium text-red-500">
                            {form.formState.errors.sellingPrice.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="discount" className="text-sm font-semibold text-foreground">Chiết khấu hãng</Label>
                      <div className="space-y-1">
                        <div className="relative">
                        <Input
                          id="discount"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className="h-11 bg-background pr-14 text-right font-semibold"
                          value={formatVndInput(Number(watchedDiscount) || 0)}
                          onChange={(event) => handleMoneyChange("discount", event.target.value)}
                        />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            VND
                          </span>
                        </div>
                        {form.formState.errors.discount && (
                          <p className="text-xs font-medium text-red-500">
                            {form.formState.errors.discount.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/70 bg-background px-3 py-2.5">
                    <div className="grid gap-3">
                      <Label htmlFor="trueIncome" className="text-sm font-semibold text-foreground">Lợi nhuận</Label>
                      <div className="relative space-y-1">
                        <Input
                          id="trueIncome"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          readOnly={!isTrueIncomeEditable}
                          className={cn(
                            "h-11 border-primary/20 bg-background pr-24 text-right font-semibold text-primary",
                            !isTrueIncomeEditable && "cursor-default bg-secondary/50 text-primary/90",
                          )}
                          value={formatVndInput(Number(watchedTrueIncome) || 0)}
                          onChange={handleTrueIncomeChange}
                        />
                        <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          VND
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute right-1.5 top-1.5 h-8 w-8 bg-background"
                          onClick={handleToggleTrueIncomeEdit}
                          aria-label={isTrueIncomeEditable ? "Khóa thu nhập thực" : "Chỉnh sửa thu nhập thực"}
                          title={isTrueIncomeEditable ? "Khóa thu nhập thực" : "Chỉnh sửa thu nhập thực"}
                        >
                          {isTrueIncomeEditable ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </Button>
                        {form.formState.errors.trueIncome && (
                          <p className="text-xs font-medium text-red-500">
                            {form.formState.errors.trueIncome.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flight Details Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border/40 mb-4">
                <CardTitle className="text-lg">Chi tiết chuyến bay</CardTitle>
                <CardDescription>Thông tin hành trình và mã đặt chỗ.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* PNR + Airline row */}
                <div className="grid gap-4 2xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pnr">Mã đặt chỗ (PNR)</Label>
                    <Input
                      id="pnr"
                      placeholder="Ví dụ: XYZ987"
                      className={cn("uppercase", hasExtractedData && "border-primary/20 bg-primary/5")}
                      {...form.register("pnr")}
                    />
                    {form.formState.errors.pnr && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.pnr.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airline">Hãng bay <span className="text-red-500">*</span></Label>
                    <Input
                      id="airline"
                      placeholder="Ví dụ: VNA"
                      className={cn("uppercase", hasExtractedData && "border-primary/20 bg-primary/5")}
                      {...form.register("airline")}
                    />
                    {form.formState.errors.airline && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.airline.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketNumber">Số vé <span className="text-red-500">*</span></Label>
                    <Input
                      id="ticketNumber"
                      placeholder="Ví dụ: 7382319992101"
                      className={cn(hasExtractedData && "border-primary/20 bg-primary/5")}
                      {...form.register("ticketNumber")}
                    />
                    {form.formState.errors.ticketNumber && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.ticketNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 2xl:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departurePlace">Nơi đi</Label>
                    <Input
                      id="departurePlace"
                      placeholder="Ví dụ: Da Nang City"
                      className={cn(hasExtractedData && "border-primary/20 bg-primary/5")}
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
                      className={cn(hasExtractedData && "border-primary/20 bg-primary/5")}
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
                <div className="grid gap-4 rounded-xl border border-border/50 bg-secondary/30 p-4 2xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="departureCode">Mã nơi đi</Label>
                    <Input
                      id="departureCode"
                      placeholder="Ví dụ: DAD"
                      className={cn("uppercase bg-background", hasExtractedData && "border-primary/20 bg-primary/5")}
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
                      className={cn("uppercase bg-background", hasExtractedData && "border-primary/20 bg-primary/5")}
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
                      placeholder="Ví dụ: DAD-SGN"
                      readOnly
                      className="bg-muted/50 text-muted-foreground uppercase"
                      {...form.register("route")}
                    />
                    {form.formState.errors.route && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.route.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="flightDate">Ngày giờ bay</Label>
                  <Input
                    id="flightDate"
                    type="datetime-local"
                    className={cn(hasExtractedData && "border-primary/20 bg-primary/5")}
                    {...form.register("flightDate")}
                  />
                  {form.formState.errors.flightDate && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.flightDate.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Passengers Card */}
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Hành khách <span className="text-red-500">*</span></CardTitle>
                  <CardDescription>Danh sách người bay trên vé này.</CardDescription>
                </div>
                <Button
                  type="button"
                  id="add-passenger-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "" })}
                  className="shrink-0"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Thêm người
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm font-medium">
                          {index + 1}.
                        </div>
                        <Input
                          id={`passenger-${index}`}
                          placeholder="Tên hành khách"
                          className={cn("pl-8 uppercase", hasExtractedData && "border-primary/20 bg-primary/5")}
                          {...form.register(`passengers.${index}.name`)}
                        />
                      </div>
                      {form.formState.errors.passengers?.[index]?.name && (
                        <p className="text-xs text-red-500 px-1">
                          {form.formState.errors.passengers[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      aria-label={`Remove passenger ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Submit Action */}
            <div className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Xác nhận tạo công nợ</p>
                <p className="text-xs text-muted-foreground mt-0.5">Vé sau khi lưu sẽ được tính vào công nợ của khách hàng.</p>
              </div>
              <Button
                id="save-ticket-btn"
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
                className="shrink-0"
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
    </div>
  );
}
