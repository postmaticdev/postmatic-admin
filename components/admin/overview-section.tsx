"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  Users,
} from "lucide-react";
import { AdminSectionId, getActions } from "@/lib/admin-endpoints";
import { adminGet, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import {
  buildDailySeries,
  latestActivity,
  metricNumber,
  paginationTotal,
  tokenAvailable,
  tokenBalanceFromHistory,
} from "./api-derived";
import { quickActionIds } from "./data";
import {
  AreaChart,
  BarChart,
  DataTable,
  EmptyState,
  formatNumber,
  formatRupiah,
  getBoolean,
  getNumber,
  getText,
  InlineValue,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
} from "./shared";

type TopBusiness = {
  id: string;
  name: string;
  owner: string;
  plan: string;
  tokens: number | null;
  tokenLoading: boolean;
};

type FinanceActivity = {
  title: string;
  date: string;
};

const tokenHistoryQuery = {
  page: "1",
  limit: "1000",
  sort: "desc",
  sortBy: "id",
};

export function OverviewSection({
  onOpenSection,
}: {
  onOpenSection: (section: AdminSectionId) => void;
}) {
  const financeOverview = useQuery({
    queryKey: ["dashboardMetric", "/finance/manage/overview"],
    queryFn: () => adminGet("/finance/manage/overview"),
  });
  const userOverview = useQuery({
    queryKey: ["dashboardMetric", "/user/manage/overview"],
    queryFn: () => adminGet("/user/manage/overview"),
  });
  const businessOverview = useQuery({
    queryKey: ["dashboardMetric", "/business/manage/overview"],
    queryFn: () => adminGet("/business/manage/overview"),
  });
  const businessList = useQuery({
    queryKey: ["resourceList", "business", { page: "1", limit: "20" }],
    queryFn: () => adminGet("/business/manage", { page: "1", limit: "20" }),
  });
  const financeList = useQuery({
    queryKey: ["resourceList", "finance", { page: "1", limit: "100" }],
    queryFn: () => adminGet("/finance/manage", { page: "1", limit: "100" }),
  });
  const aiModelList = useQuery({
    queryKey: ["resourceList", "ai-model"],
    queryFn: () => adminGet("/app/generative-image-model"),
  });

  const financeRows = useMemo(
    () => extractRows(financeList.data).map(mapFinanceRow),
    [financeList.data]
  );

  const businessRows = useMemo(
    () => extractRows(businessList.data).map(mapTopBusiness),
    [businessList.data]
  );

  const tokenStatusQueries = useQueries({
    queries: businessRows.map((row) => ({
      queryKey: ["businessTokenStatus", row.id],
      queryFn: () => adminGet(`/generative-token/image-token/${row.id}/status`),
      enabled: Boolean(row.id && row.id !== "-"),
      retry: false,
    })),
  });
  const tokenHistoryQueries = useQueries({
    queries: businessRows.map((row) => ({
      queryKey: ["businessTokenHistory", row.id],
      queryFn: () => adminGet(`/generative-token/image-token/${row.id}`, tokenHistoryQuery),
      enabled: Boolean(row.id && row.id !== "-"),
      retry: false,
    })),
  });

  const topBusinesses = useMemo(() => {
    return businessRows
      .map((row, index) => {
        const available = tokenAvailable(tokenStatusQueries[index]?.data);
        const historyBalance = tokenBalanceFromHistory(tokenHistoryQueries[index]?.data);
        return {
          ...row,
          tokens: available ?? historyBalance ?? row.tokens,
          tokenLoading:
            (tokenStatusQueries[index]?.isLoading ?? false) ||
            (tokenHistoryQueries[index]?.isLoading ?? false),
        };
      })
      .sort((a, b) => (b.tokens ?? -1) - (a.tokens ?? -1))
      .slice(0, 5);
  }, [businessRows, tokenHistoryQueries, tokenStatusQueries]);

  const dailyFinance = useMemo(
    () =>
      buildDailySeries(
        financeRows,
        (row) => row.date,
        (row) => row.amount,
        30
      ),
    [financeRows]
  );

  const activities = useMemo<FinanceActivity[]>(
    () =>
      latestActivity(
        financeRows,
        (row) => `${row.type} ${formatRupiah(row.amount)} - ${row.business}`,
        (row) => row.date
      ),
    [financeRows]
  );

  const activeModels = extractRows(aiModelList.data).filter((row) =>
    getBoolean(row, ["isActive", "active"], false)
  ).length;
  const revenueMetric = metricNumber(financeOverview.data, [
    "revenue",
    "income",
    "total",
  ]);
  const revenueFromRows = financeRows.reduce((total, row) => total + row.amount, 0);
  const revenue = revenueMetric || revenueFromRows;
  const users = metricNumber(userOverview.data, ["active", "user", "total"]);
  const businessTotal =
    metricNumber(businessOverview.data, ["active", "business", "total"]) ||
    paginationTotal(businessList.data) ||
    topBusinesses.length;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Overview"
        title="Operasional Postmatic hari ini"
        description="Satu layar untuk membaca data platform dari endpoint admin yang tersedia."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={revenue ? formatRupiah(revenue) : "-"}
          icon={CircleDollarSign}
          tone="green"
        />
        <MetricCard
          title="Active Users"
          value={users ? formatNumber(users) : "-"}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          title="Active Businesses"
          value={businessTotal ? formatNumber(businessTotal) : "-"}
          icon={BriefcaseBusiness}
          tone="amber"
        />
        <MetricCard
          title="AI Model Aktif"
          value={aiModelList.isLoading ? "-" : formatNumber(activeModels)}
          icon={Sparkles}
          tone="ink"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Panel title="Revenue Trend (30 hari)" subtitle="Diagregasi dari /finance/manage">
          {hasSeriesValue(dailyFinance.map((point) => point.value)) ? (
            <AreaChart
              values={dailyFinance.map((point) => point.value)}
              labels={dailyFinance.map((point) => point.label)}
              id="overview-revenue"
            />
          ) : (
            <EmptyState label="Belum ada data finance untuk grafik revenue." />
          )}
        </Panel>

        <Panel title="Transaksi per Hari" subtitle="Jumlah transaksi dari /finance/manage">
          {hasSeriesValue(dailyFinance.map((point) => point.count)) ? (
            <BarChart
              values={dailyFinance.map((point) => point.count)}
              labels={dailyFinance.map((point) => point.label)}
            />
          ) : (
            <EmptyState label="Belum ada data transaksi untuk grafik harian." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Panel title="Top Bisnis Aktif" subtitle="Diurutkan berdasarkan token balance API">
          <DataTable<TopBusiness>
            rows={topBusinesses}
            isLoading={businessList.isLoading}
            emptyLabel="Belum ada data bisnis dari API."
            columns={[
              {
                key: "business",
                header: "Bisnis",
                render: (row) => <InlineValue primary={row.name} secondary={row.owner} />,
              },
              {
                key: "plan",
                header: "Paket",
                render: (row) => <StatusBadge value={row.plan} />,
              },
              {
                key: "token",
                header: "Token",
                className: "text-right",
                render: (row) =>
                  row.tokenLoading
                    ? "..."
                    : row.tokens === null
                      ? "-"
                      : formatNumber(row.tokens),
              },
            ]}
          />
        </Panel>

        <Panel title="Aktivitas Terbaru" subtitle="Dari transaksi finance terbaru">
          {financeList.isLoading ? (
            <EmptyState label="Memuat aktivitas..." />
          ) : activities.length ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={`${activity.title}-${activity.date}`} className="flex gap-3">
                  <div className="mt-1 size-2 rounded-full bg-slate-950" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">
                      {activity.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{activity.date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="Belum ada aktivitas dari endpoint finance." />
          )}
        </Panel>
      </div>

      <Panel title="Quick Actions" subtitle="Pintasan ke operasi admin yang tersedia">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quickActionIds.map((actionId) => {
            const action = getAllActions().find((item) => item.id === actionId);
            if (!action) return null;
            return (
              <button
                key={action.id}
                className="flex min-h-20 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-slate-300 hover:bg-white"
                onClick={() => onOpenSection(action.section)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {action.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {action.description}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function mapTopBusiness(row: JsonRecord): TopBusiness {
  return {
    id: getText(row, ["id", "businessRootId", "rootBusinessId"]),
    name: getText(row, ["name", "knowledge.name", "business.name"]),
    owner: getText(row, ["owner.name", "user.name", "profile.name"]),
    plan: getText(row, ["plan", "package", "subscription.plan"]),
    tokens: getOptionalNumber(row, [
      "availableToken",
      "tokenBalance",
      "tokens",
      "balance",
      "totalToken",
      "totalTopupTokenAmount",
      "totalSuccessTopupTokenAmount",
    ]),
    tokenLoading: false,
  };
}

function getOptionalNumber(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const number = getNumber(row, [key], Number.NaN);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function mapFinanceRow(row: JsonRecord) {
  return {
    date: getText(row, ["date", "createdAt", "paidAt"]),
    business: getText(row, ["business.name", "businessName", "source"]),
    type: getText(row, ["type", "service", "note"], "Transaksi"),
    amount: getNumber(row, ["amount", "total", "value"], 0),
  };
}

function hasSeriesValue(values: number[]) {
  return values.some((value) => value > 0);
}

function getAllActions() {
  return ["business", "users", "ai-model", "finance", "crm"].flatMap((section) =>
    getActions(section as Exclude<AdminSectionId, "dashboard">)
  );
}
