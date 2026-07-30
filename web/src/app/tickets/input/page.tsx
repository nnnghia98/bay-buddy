"use client";

import patterns from "@/styles/ui-patterns.module.css"
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { Banner } from "@astryxdesign/core/Banner";
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
  Pencil,
  Lock,
} from "lucide-react";


import { Panel } from "@/components/command-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch, apiFetchData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOGIN_PATH, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import {
  CustomerDirectoryItemSchema,
  type CustomerDirectoryItem,
} from "@/schemas";
import styles from "./ticket-input.module.css";

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
  pnr?: string | null;
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
  const departureCode = data.departureCode?.trim().toUpperCase();
  const arrivalCode = data.arrivalCode?.trim().toUpperCase();
  const derivedItineraryFromCodes =
    departureCode && arrivalCode ? `${departureCode}-${arrivalCode}` : undefined;
  const itinerary = data.route?.trim().toUpperCase() || derivedItineraryFromCodes || "UNK-UNK";

  const payload = {
    customer_name: data.customerName?.trim() || firstPassengerName || "Unknown Passenger",
    pnr: data.pnr?.trim().toUpperCase() || null,
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
      form.setValue("pnr", data.pnr ?? "");
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
  const extractedClassName = hasExtractedData ? styles.extracted : undefined;

  if (!isReady || !token) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={patterns.page}>
      <div className={styles.workbench}>
          {/* ---------------------------------------------------------------- */}
          {/* Left column – File upload / Preview (Sticky)                     */}
          {/* ---------------------------------------------------------------- */}
          <div className={styles.uploadColumn}>
            <Panel>
              <div className={styles.panelHeader}>
                <p className={patterns.accentEyebrow}>
                  Chứng từ đặt chỗ
                </p>
              </div>
              <div className={styles.panelBody}>
                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  id="file-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className={patterns.hidden}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                {/* Drop zone */}
                <button
                  type="button"
                  aria-label="Upload ticket file"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    styles.dropZone,
                    isDragging && styles.dropZoneDragging,
                  )}
                >
                  {/* Preview area */}
                  {isImage && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Ticket preview"
                      className={styles.previewImage}
                    />
                  ) : isPDF ? (
                    <div className={styles.filePreview}>
                      <FileText
                        className={styles.previewIcon}
                        strokeWidth={1.5}
                      />
                      <span className={styles.filePreviewName}>
                        {file!.name}
                      </span>
                      <span className={patterns.supportingText}>
                        {(file!.size / 1024).toFixed(1)} KB - PDF document
                      </span>
                    </div>
                  ) : (
                    <div className={styles.uploadPrompt}>
                      <UploadCloud className={styles.uploadIcon} strokeWidth={1.5} />
                      <div>
                        <p className={patterns.labelText}>
                          Kéo thả, dán (Ctrl+V) hoặc bấm để tải file
                        </p>
                        <p className={styles.fileFormatHint}>JPEG, PNG, WebP hoặc PDF</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Parsing Overlay */}
                  {mutation.isPending && (
                    <div className={styles.parseOverlay}>
                      <Loader2
                        className={cn(styles.overlaySpinner, patterns.spinner)}
                      />
                      <p className={patterns.labelText}>AI đang trích xuất dữ liệu...</p>
                      <p className={styles.overlayHint}>Quá trình này có thể mất vài giây</p>
                    </div>
                  )}
                </button>

                {/* File info bar + Clear button */}
                {file && !mutation.isPending && (
                  <div className={styles.fileBar}>
                    <div className={styles.fileBarName}>
                      <FileText className={patterns.iconSmall} />
                      <span className={styles.fileName}>
                        {file.name}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={clearFile}
                      aria-label="Remove file"
                      title="Remove file"
                      type="button"
                    >
                      <X className={patterns.iconSmall} />
                    </Button>
                  </div>
                )}

                {/* Parse button */}
                <Button
                  id="parse-with-ai-btn"
                  onClick={handleParseWithAI}
                  className={patterns.fullWidth}
                  size="lg"
                  disabled={!file || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className={cn(patterns.iconSmall, patterns.spinner)} />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Wand2 className={patterns.iconSmall} />
                      Nhập vé
                    </>
                  )}
                </Button>

                {hasExtractedData && (
                  <Banner
                    status="success"
                    title="Dữ liệu đã được trích xuất. Vui lòng kiểm tra và chỉnh sửa nếu cần trước khi lưu."
                  />
                )}
                
                {mutation.isError && (
                  <Banner
                    status="error"
                    title={(mutation.error as Error).message}
                  />
                )}
              </div>
            </Panel>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right column – React Hook Form                                   */}
          {/* ---------------------------------------------------------------- */}
          <form
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={form.handleSubmit(onSubmit as any)}
            className={styles.form}
          >
            {/* Customer & Price Card */}
            <Panel>
              <div className={styles.panelHeader}>
                <p className={patterns.accentEyebrow}>
                  Thông tin giao dịch
                </p>
              </div>
              <div className={styles.formPanelBody}>
                <div className={patterns.fieldStack}>
                  <Label htmlFor="customerName" className={patterns.sectionTitle}>Tên khách hàng</Label>
                  <Input
                    id="customerName"
                    list="customerNameOptions"
                    placeholder="Ví dụ: Nguyen Van A"
                    className={extractedClassName}
                    {...form.register("customerName")}
                  />
                  <datalist id="customerNameOptions">
                    {customerNameOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {form.formState.errors.customerName && (
                    <p className={patterns.errorSupportingText}>
                      {form.formState.errors.customerName.message}
                    </p>
                  )}
                </div>

                <div className={styles.priceSurface}>
                  <div className={patterns.stack}>
                    <div className={patterns.fieldStack}>
                      <Label htmlFor="totalPrice" className={patterns.sectionTitle}>Giá gốc <span className={styles.required}>*</span></Label>
                      <div className={patterns.compactStack}>
                        <div className={styles.moneyField}>
                        <Input
                          id="totalPrice"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={cn(styles.moneyInput, extractedClassName)}
                          value={formatVndInput(Number(watchedNetPrice) || 0)}
                          onChange={(event) => handleMoneyChange("totalPrice", event.target.value)}
                        />
                          <span className={styles.currencySuffix}>
                            VND
                          </span>
                        </div>
                        {form.formState.errors.totalPrice && (
                          <p className={patterns.errorSupportingText}>
                            {form.formState.errors.totalPrice.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={patterns.fieldStack}>
                      <Label htmlFor="sellingPrice" className={patterns.sectionTitle}>Giá bán <span className={styles.required}>*</span></Label>
                      <div className={patterns.compactStack}>
                        <div className={styles.moneyField}>
                        <Input
                          id="sellingPrice"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={styles.moneyInput}
                          value={formatVndInput(Number(watchedSellingPrice) || 0)}
                          onChange={(event) => handleMoneyChange("sellingPrice", event.target.value)}
                        />
                          <span className={styles.currencySuffix}>
                            VND
                          </span>
                        </div>
                        {form.formState.errors.sellingPrice && (
                          <p className={patterns.errorSupportingText}>
                            {form.formState.errors.sellingPrice.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={patterns.fieldStack}>
                      <Label htmlFor="discount" className={patterns.sectionTitle}>Chiết khấu hãng</Label>
                      <div className={patterns.compactStack}>
                        <div className={styles.moneyField}>
                        <Input
                          id="discount"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={styles.moneyInput}
                          value={formatVndInput(Number(watchedDiscount) || 0)}
                          onChange={(event) => handleMoneyChange("discount", event.target.value)}
                        />
                          <span className={styles.currencySuffix}>
                            VND
                          </span>
                        </div>
                        {form.formState.errors.discount && (
                          <p className={patterns.errorSupportingText}>
                            {form.formState.errors.discount.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.incomeSurface}>
                    <div className={patterns.stack}>
                      <Label htmlFor="trueIncome" className={patterns.sectionTitle}>Lợi nhuận</Label>
                      <div className={styles.incomeField}>
                        <Input
                          id="trueIncome"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          readOnly={!isTrueIncomeEditable}
                          className={cn(
                            styles.incomeInput,
                            !isTrueIncomeEditable && styles.incomeReadOnly,
                          )}
                          value={formatVndInput(Number(watchedTrueIncome) || 0)}
                          onChange={handleTrueIncomeChange}
                        />
                        <span className={cn(styles.currencySuffix, styles.incomeCurrencySuffix)}>
                          VND
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={styles.incomeEdit}
                          onClick={handleToggleTrueIncomeEdit}
                          aria-label={isTrueIncomeEditable ? "Khóa thu nhập thực" : "Chỉnh sửa thu nhập thực"}
                          title={isTrueIncomeEditable ? "Khóa thu nhập thực" : "Chỉnh sửa thu nhập thực"}
                        >
                          {isTrueIncomeEditable ? (
                            <Lock className={patterns.iconSmall} />
                          ) : (
                            <Pencil className={patterns.iconSmall} />
                          )}
                        </Button>
                        {form.formState.errors.trueIncome && (
                          <p className={patterns.errorSupportingText}>
                            {form.formState.errors.trueIncome.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Flight Details Card */}
            <Panel>
              <div className={styles.panelHeader}>
                <p className={patterns.accentEyebrow}>
                  Chi tiết chuyến bay
                </p>
              </div>
              <div className={styles.flightPanelBody}>
                {/* PNR + Airline row */}
                <div className={styles.threeFieldGrid}>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="pnr">Mã đặt chỗ (PNR)</Label>
                    <Input
                      id="pnr"
                      placeholder="Ví dụ: XYZ987"
                      className={cn(styles.uppercase, extractedClassName)}
                      {...form.register("pnr")}
                    />
                    {form.formState.errors.pnr && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.pnr.message}
                      </p>
                    )}
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="airline">Hãng bay <span className={styles.required}>*</span></Label>
                    <Input
                      id="airline"
                      placeholder="Ví dụ: VNA"
                      className={cn(styles.uppercase, extractedClassName)}
                      {...form.register("airline")}
                    />
                    {form.formState.errors.airline && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.airline.message}
                      </p>
                    )}
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="ticketNumber">Số vé <span className={styles.required}>*</span></Label>
                    <Input
                      id="ticketNumber"
                      placeholder="Ví dụ: 7382319992101"
                      className={extractedClassName}
                      {...form.register("ticketNumber")}
                    />
                    {form.formState.errors.ticketNumber && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.ticketNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.twoFieldGrid}>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="departurePlace">Nơi đi</Label>
                    <Input
                      id="departurePlace"
                      placeholder="Ví dụ: Da Nang City"
                      className={extractedClassName}
                      {...form.register("departurePlace")}
                    />
                    {form.formState.errors.departurePlace && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.departurePlace.message}
                      </p>
                    )}
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="arrivalPlace">Nơi đến</Label>
                    <Input
                      id="arrivalPlace"
                      placeholder="Ví dụ: Ho Chi Minh City"
                      className={extractedClassName}
                      {...form.register("arrivalPlace")}
                    />
                    {form.formState.errors.arrivalPlace && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.arrivalPlace.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Route & Date */}
                <div className={styles.routeSurface}>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="departureCode">Mã nơi đi</Label>
                    <Input
                      id="departureCode"
                      placeholder="Ví dụ: DAD"
                      className={cn(styles.uppercase, extractedClassName)}
                      {...form.register("departureCode")}
                    />
                    {form.formState.errors.departureCode && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.departureCode.message}
                      </p>
                    )}
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="arrivalCode">Mã nơi đến</Label>
                    <Input
                      id="arrivalCode"
                      placeholder="Ví dụ: SGN"
                      className={cn(styles.uppercase, extractedClassName)}
                      {...form.register("arrivalCode")}
                    />
                    {form.formState.errors.arrivalCode && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.arrivalCode.message}
                      </p>
                    )}
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="route">Hành trình</Label>
                    <Input
                      id="route"
                      placeholder="Ví dụ: DAD-SGN"
                      readOnly
                      className={styles.readOnlyInput}
                      {...form.register("route")}
                    />
                    {form.formState.errors.route && (
                      <p className={patterns.errorSupportingText}>
                        {form.formState.errors.route.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={patterns.fieldStack}>
                  <Label htmlFor="flightDate">Ngày giờ bay</Label>
                  <Input
                    id="flightDate"
                    type="datetime-local"
                    className={extractedClassName}
                    {...form.register("flightDate")}
                  />
                  {form.formState.errors.flightDate && (
                    <p className={patterns.errorSupportingText}>
                      {form.formState.errors.flightDate.message}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            {/* Passengers Card */}
            <Panel>
              <div className={styles.passengerHeader}>
                <div>
                  <p className={patterns.accentEyebrow}>
                    Hành khách <span className={styles.required}>*</span>
                  </p>
                </div>
                <Button
                  type="button"
                  id="add-passenger-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "" })}
                  className={patterns.shrinkNone}
                >
                  <Plus className={patterns.iconSmall} />
                  Thêm người
                </Button>
              </div>
              <div className={styles.passengerBody}>
                {fields.map((field, index) => (
                  <div key={field.id} className={patterns.rowStart}>
                    <div className={styles.passengerField}>
                      <div className={patterns.relative}>
                        <div className={styles.passengerIndex}>
                          {index + 1}.
                        </div>
                        <Input
                          id={`passenger-${index}`}
                          placeholder="Tên hành khách"
                          className={cn(styles.passengerInput, extractedClassName)}
                          {...form.register(`passengers.${index}.name`)}
                        />
                      </div>
                      {form.formState.errors.passengers?.[index]?.name && (
                        <p className={cn(patterns.errorSupportingText, styles.passengerError)}>
                          {form.formState.errors.passengers[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      aria-label={`Remove passenger ${index + 1}`}
                    >
                      <Trash2 className={patterns.iconSmall} />
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Submit Action */}
            <div className={styles.submitBar}>
              <div>
                <p className={patterns.labelText}>Xác nhận tạo công nợ</p>
                <p className={styles.submitHint}>Vé sau khi lưu sẽ được tính vào công nợ của khách hàng.</p>
              </div>
              <Button
                id="save-ticket-btn"
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
                className={patterns.shrinkNone}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className={cn(patterns.iconSmall, patterns.spinner)} />
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
