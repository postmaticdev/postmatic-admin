"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CircleDollarSign,
  MinusCircle,
  Plus,
  ReceiptText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminAction, getActions, getResource } from "@/lib/admin-endpoints";
import { adminGet, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { ActionDialog } from "./action-dialog";
import {
  buildDailySeries,
  metricNumber,
  paginationTotal,
} from "./api-derived";
import {
  AreaChart,
  DataTable,
  EmptyState,
  formatNumber,
  formatRupiah,
  getNumber,
  getText,
  InlineValue,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
} from "./shared";

type TransactionRow = {
  id: string;
  date: string;
  business: string;
  service: string;
  amount: number;
  status: string;
  type: string;
};

export function FinanceSection() {
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogAction, setDialogAction] = useState<AdminAction | null>(null);
  const resource = getResource("finance");
  const incomeAction = getActions("finance").find((action) => action.id === "finance-income");
  const expenseAction = getActions("finance").find((action) => action.id === "finance-expense");

  const overviewQuery = useQuery({
    queryKey: ["resourceOverview", "finance"],
    queryFn: () => adminGet("/finance/manage/overview"),
  });
  const listQuery = useQuery({
    queryKey: ["resourceList", "finance", { page: "1", limit: "100" }],
    queryFn: () => adminGet("/finance/manage", { page: "1", limit: "100" }),
  });

  const allRows = useMemo(
    () => extractRows(listQuery.data).map(mapTransaction),
    [listQuery.data]
  );

  const rows = useMemo(() => {
    const text = queryText.toLowerCase();
    return allRows.filter((row) => {
      const matchText =
        !text ||
        row.id.toLowerCase().includes(text) ||
        row.business.toLowerCase().includes(text) ||
        row.service.toLowerCase().includes(text);
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [allRows, queryText, statusFilter]);

  const dailyFinance = useMemo(
    () =>
      buildDailySeries(
        allRows,
        (row) => row.date,
        (row) => row.amount,
        30
      ),
    [allRows]
  );

  const revenueFromOverview = metricNumber(overviewQuery.data, [
    "revenue",
    "income",
    "total",
  ]);
  const incomeFromRows = sumMatching(allRows, ["income", "credit", "revenue"]);
  const expenseFromRows = sumMatching(allRows, ["expense", "debit"]);
  const revenue = revenueFromOverview || incomeFromRows || sumAmounts(allRows);
  const transactionCount = paginationTotal(listQuery.data) ?? allRows.length;
  const average = allRows.length ? Math.round(sumAmounts(allRows) / allRows.length) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Financing"
        title="Pendapatan dan transaksi"
        description="Lihat performa pendapatan dan riwayat transaksi berdasarkan endpoint finance admin."
        action={
          <div className="flex flex-wrap gap-2">
            {expenseAction && (
              <Button variant="outline" onClick={() => setDialogAction(expenseAction)}>
                <ReceiptText />
                Expense
              </Button>
            )}
            {incomeAction && (
              <Button onClick={() => setDialogAction(incomeAction)}>
                <Plus />
                Income
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Pendapatan"
          value={revenue ? formatRupiah(revenue) : "-"}
          icon={CircleDollarSign}
          tone="green"
        />
        <MetricCard
          title="Total Transaksi"
          value={formatNumber(transactionCount)}
          icon={ReceiptText}
          tone="blue"
        />
        <MetricCard
          title="Rata-rata Nilai"
          value={average ? formatRupiah(average) : "-"}
          icon={ArrowUpRight}
          tone="amber"
        />
        <MetricCard
          title="Total Expense"
          value={expenseFromRows ? formatRupiah(expenseFromRows) : "-"}
          icon={MinusCircle}
          tone="red"
        />
      </div>

      <Panel title="Sales Scorecard - Postmatic.id" subtitle="Revenue 30 hari dari /finance/manage">
        {hasSeriesValue(dailyFinance.map((point) => point.value)) ? (
          <AreaChart
            values={dailyFinance.map((point) => point.value)}
            labels={dailyFinance.map((point) => point.label)}
            color="#c05621"
            fill="#fed7aa"
            id="finance-revenue"
          />
        ) : (
          <EmptyState label="Belum ada data finance untuk grafik revenue." />
        )}
      </Panel>

      <Panel
        title="Transaksi"
        subtitle="Riwayat dari /finance/manage"
        action={
          <div className="grid gap-2 sm:grid-cols-[14rem_10rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                className="pl-9"
                placeholder="Cari ID atau bisnis"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-xs"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Semua Status</option>
              {uniqueStatuses(allRows).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <DataTable<TransactionRow>
          rows={rows}
          isLoading={listQuery.isLoading}
          emptyLabel="Belum ada transaksi dari API."
          columns={[
            {
              key: "id",
              header: "ID",
              render: (row) => <span className="font-medium text-slate-950">{row.id}</span>,
            },
            {
              key: "date",
              header: "Tanggal",
              render: (row) => row.date,
            },
            {
              key: "business",
              header: "Bisnis",
              render: (row) => <InlineValue primary={row.business} secondary={row.service} />,
            },
            {
              key: "amount",
              header: "Jumlah",
              className: "text-right",
              render: (row) => formatRupiah(row.amount),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge value={row.status} />,
            },
          ]}
        />
      </Panel>

      {dialogAction && resource && (
        <ActionDialog
          action={dialogAction}
          resource={resource}
          selected={null}
          onClose={() => setDialogAction(null)}
        />
      )}
    </div>
  );
}

function mapTransaction(row: JsonRecord): TransactionRow {
  return {
    id: getText(row, ["id", "transactionId", "code"]),
    date: getText(row, ["date", "createdAt", "paidAt"]),
    business: getText(row, ["business.name", "businessName", "source"]),
    service: getText(row, ["service", "note", "source", "type"]),
    amount: getNumber(row, ["amount", "total", "value"], 0),
    status: getText(row, ["status", "paymentStatus"]),
    type: getText(row, ["type", "source"]),
  };
}

function sumAmounts(rows: TransactionRow[]) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function sumMatching(rows: TransactionRow[], keywords: string[]) {
  return rows.reduce((total, row) => {
    const type = row.type.toLowerCase();
    return keywords.some((keyword) => type.includes(keyword))
      ? total + row.amount
      : total;
  }, 0);
}

function uniqueStatuses(rows: TransactionRow[]) {
  return Array.from(
    new Set(rows.map((row) => row.status).filter((status) => status !== "-"))
  );
}

function hasSeriesValue(values: number[]) {
  return values.some((value) => value > 0);
}
