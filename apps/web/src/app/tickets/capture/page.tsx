"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
  flightDate: z.string().min(1, "Flight Date is required"),
  passengers: z
    .array(passengerSchema)
    .min(1, "At least one passenger is required"),
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
  flightDate: string;
  passengers: { name: string }[];
  route: string;
  totalPrice: number;
};

// ---------------------------------------------------------------------------
// API response type (matches backend ParseFlightResponse)
// ---------------------------------------------------------------------------

interface ParsedFlightData {
  pnr: string;
  airline: string;
  passengers: string[];
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
    passengers: data.passengers.map((p) => p.name),
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
      flightDate: "",
      passengers: [{ name: "" }],
      route: "",
      totalPrice: 0,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "passengers",
  });

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
      toast.success("Ticket saved and debt recorded!");
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Capture Ticket</h1>
        <p className="text-gray-500 mt-1">
          Upload a booking confirmation image or PDF to extract flight data with
          AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ------------------------------------------------------------------ */}
        {/* Left column – File upload / Preview                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div>
            <Label className="text-base font-semibold">
              Booking Confirmation
            </Label>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload an image (JPEG, PNG, WebP) or PDF e-ticket.
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
            className={[
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed",
              "transition-colors cursor-pointer select-none",
              "min-h-[320px]",
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30",
            ].join(" ")}
          >
            {/* Preview area */}
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Ticket preview"
                className="max-h-72 max-w-full rounded object-contain p-2"
              />
            ) : isPDF ? (
              <div className="flex flex-col items-center gap-3 text-gray-500 py-8">
                <FileText
                  className="h-16 w-16 text-blue-400"
                  strokeWidth={1.5}
                />
                <span className="text-sm font-medium text-gray-700">
                  {file!.name}
                </span>
                <span className="text-xs text-gray-400">
                  {(file!.size / 1024).toFixed(1)} KB — PDF Document
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400 p-8 text-center">
                <UploadCloud className="h-12 w-12" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag &amp; drop, or click to upload
                  </p>
                  <p className="text-xs mt-1">JPEG, PNG, WebP, or PDF</p>
                </div>
              </div>
            )}
          </div>

          {/* File info bar + Clear button */}
          {file && (
            <div className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
              <span className="truncate text-gray-700 max-w-[80%]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={clearFile}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
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
            className="w-full mt-1"
            size="lg"
            disabled={!file || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Parse with AI
              </>
            )}
          </Button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Right column – React Hook Form                                     */}
        {/* ------------------------------------------------------------------ */}
        <form
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="flex flex-col gap-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div>
            <h2 className="text-xl font-semibold mb-0.5">Ticket Details</h2>
            <p className="text-sm text-gray-500">
              Verify or edit the extracted information.
            </p>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name (Client)</Label>
            <Input
              id="customerName"
              placeholder="e.g. Nguyen Van A"
              {...form.register("customerName")}
            />
            {form.formState.errors.customerName && (
              <p className="text-xs text-red-500">
                {form.formState.errors.customerName.message}
              </p>
            )}
          </div>

          {/* PNR + Airline row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pnr">PNR / Booking Ref.</Label>
              <Input
                id="pnr"
                placeholder="e.g. XYZ987"
                {...form.register("pnr")}
              />
              {form.formState.errors.pnr && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.pnr.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="airline">Airline</Label>
              <Input
                id="airline"
                placeholder="e.g. VNA"
                {...form.register("airline")}
              />
              {form.formState.errors.airline && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.airline.message}
                </p>
              )}
            </div>
          </div>

          {/* Route & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route (Sector)</Label>
              <Input
                id="route"
                placeholder="e.g. SGN-HAN"
                {...form.register("route")}
              />
              {form.formState.errors.route && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.route.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="flightDate">Flight Date</Label>
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
            <Label htmlFor="totalPrice">Total Price (VND)</Label>
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
              <Label>Passengers</Label>
              <Button
                type="button"
                id="add-passenger-btn"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "" })}
              >
                <Plus className="mr-1.5 h-3 w-3" />
                Add
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id={`passenger-${index}`}
                    placeholder={`Passenger ${index + 1} Name`}
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
                  className="shrink-0 text-gray-400 hover:text-red-600"
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
          <div className="pt-4 mt-auto border-t border-gray-100 flex justify-end">
            <Button
              id="save-ticket-btn"
              type="submit"
              size="lg"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Ticket"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
