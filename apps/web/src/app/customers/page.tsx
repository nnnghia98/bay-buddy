"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Landmark, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
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

  const directoryStats = React.useMemo(() => {
    const customers = customersQuery.data ?? [];

    const outstanding = customers.reduce((sum, customer) => {
      return customer.current_balance > 0 ? sum + customer.current_balance : sum;
    }, 0);

    const credit = customers.reduce((sum, customer) => {
      return customer.current_balance < 0 ? sum + Math.abs(customer.current_balance) : sum;
    }, 0);

    return {
      totalCustomers: customers.length,
      outstanding,
      credit,
    };
  }, [customersQuery.data]);

  if (!isReady || !token) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-foreground">
      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[var(--shadow-lg),var(--theme-shadow-soft)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Danh mục khách hàng
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-medium tracking-[-0.03em] text-foreground">
                Theo dõi khách hàng và sổ công nợ theo một bảng điều hành gọn gàng.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tìm nhanh theo tên hoặc số điện thoại, xem trạng thái công nợ hiện tại và mở
                trực tiếp từng sổ chi tiết.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-secondary p-5 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Tìm kiếm nhanh
            </p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="pl-10"
                placeholder="Tìm theo tên hoặc số điện thoại"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {filteredCustomers.length} khách hàng khớp với bộ lọc hiện tại.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Tổng khách hàng
              </p>
              <p className="mt-3 text-3xl font-medium tracking-[-0.02em] text-foreground">
                {directoryStats.totalCustomers}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Công nợ phải thu
              </p>
              <p className="mt-3 text-3xl font-medium tracking-[-0.02em] text-foreground">
                {formatCurrency(directoryStats.outstanding)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-secondary text-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Tiền dư / Đặt cọc
              </p>
              <p className="mt-3 text-3xl font-medium tracking-[-0.02em] text-foreground">
                {formatCurrency(directoryStats.credit)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent text-primary">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-lg),var(--theme-shadow-soft)]">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.02em] text-foreground">
                Tài khoản khách hàng
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Chọn một dòng để mở sổ công nợ chi tiết và ghi nhận thanh toán.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {filteredCustomers.length} hiển thị
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/80 hover:bg-secondary/80">
              <TableHead>Khách hàng</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead className="text-right">Số dư hiện tại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customersQuery.isLoading ? (
              <TableRow>
                <TableCell className="py-12 text-center text-muted-foreground" colSpan={3}>
                  Đang tải danh sách khách hàng...
                </TableCell>
              </TableRow>
            ) : customersQuery.isError ? (
              <TableRow>
                <TableCell className="py-12 text-center text-red-600" colSpan={3}>
                  Không thể tải danh sách khách hàng lúc này.
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell className="py-12 text-center text-muted-foreground" colSpan={3}>
                  Không tìm thấy khách hàng phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-accent/45"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-sm font-semibold text-primary">
                        {getInitials(customer.full_name)}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{customer.full_name}</div>
                        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Mã KH: {customer.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-muted-foreground">
                    {customer.phone ? customer.phone : "Chưa cập nhật"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-6 py-5 text-right font-semibold",
                      customer.current_balance > 0
                        ? "text-red-600"
                        : customer.current_balance < 0
                          ? "text-primary"
                          : "text-foreground",
                    )}
                  >
                    <div className="inline-flex items-center justify-end gap-2">
                      {customer.current_balance < 0 ? (
                        <span className="rounded-full border border-primary/15 bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                          Tiền dư / Đặt cọc
                        </span>
                      ) : null}
                      <span>
                        {formatCurrency(Math.abs(customer.current_balance))}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
