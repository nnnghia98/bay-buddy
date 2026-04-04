"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiFetchData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CustomerDirectoryItemSchema, type CustomerDirectoryItem } from "@/schemas";
import { cn } from "@/lib/utils";
import { z } from "zod";

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

async function fetchCustomers(): Promise<CustomerDirectoryItem[]> {
  const payload = await apiFetchData<unknown>("/customers");
  return customerDirectorySchema.parse(payload);
}

export default function CustomersPage() {
  const router = useRouter();
  const { token, isReady, logout } = useAuth();
  const [searchValue, setSearchValue] = React.useState("");

  const customersQuery = useQuery({
    queryKey: ["customers-directory"],
    queryFn: fetchCustomers,
    enabled: isReady && Boolean(token),
  });

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [isReady, router, token]);

  React.useEffect(() => {
    if (customersQuery.error instanceof ApiError && customersQuery.error.status === 401) {
      logout();
      router.replace("/login");
    }
  }, [customersQuery.error, logout, router]);

  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredCustomers = !normalizedSearch
    ? customersQuery.data ?? []
    : (customersQuery.data ?? []).filter((customer) => {
        const fullName = customer.full_name.toLowerCase();
        const phone = customer.phone?.toLowerCase() ?? "";

        return fullName.includes(normalizedSearch) || phone.includes(normalizedSearch);
      });

  if (!isReady || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700">
                Customer Directory
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Danh sach khach hang</h1>
              <p className="text-sm text-slate-600">
                Track balances, search customer accounts, and jump into each ledger.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="h-11 rounded-full border-slate-200 bg-white pl-10"
                placeholder="Tim theo ten hoac so dien thoai"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-slate-900/5 backdrop-blur">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-2 text-cyan-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Customer Accounts</h2>
                <p className="text-sm text-slate-600">
                  Click any row to open the full ledger timeline.
                </p>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>Khach hang</TableHead>
                <TableHead>So dien thoai</TableHead>
                <TableHead className="text-right">So du hien tai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.isLoading ? (
                <TableRow>
                  <TableCell className="py-10 text-center text-slate-500" colSpan={3}>
                    Dang tai danh sach khach hang...
                  </TableCell>
                </TableRow>
              ) : customersQuery.isError ? (
                <TableRow>
                  <TableCell className="py-10 text-center text-red-600" colSpan={3}>
                    Khong the tai danh sach khach hang luc nay.
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell className="py-10 text-center text-slate-500" colSpan={3}>
                    Khong tim thay khach hang phu hop.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer border-slate-100 hover:bg-cyan-50/60"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {getInitials(customer.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{customer.full_name}</div>
                          <div className="text-xs text-slate-500">Customer ID: {customer.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {customer.phone ? customer.phone : "Chua cap nhat"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        customer.current_balance > 0 ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {formatCurrency(customer.current_balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
