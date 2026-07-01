"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Coins, Plus, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminAction, getActions, getResource } from "@/lib/admin-endpoints";
import { adminGet, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { ActionDialog } from "./action-dialog";
import {
  metricNumber,
  paginationTotal,
  tokenAvailable,
  tokenBalanceFromHistory,
} from "./api-derived";
import {
  DataTable,
  formatNumber,
  getBoolean,
  getNumber,
  getText,
  InlineValue,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
  sumBy,
} from "./shared";

type BusinessRow = {
  id: string;
  name: string;
  owner: string;
  plan: string;
  tokenBalance: number | null;
  tokenLoading: boolean;
  status: string;
  raw: JsonRecord;
};

const tokenHistoryQuery = {
  page: "1",
  limit: "1000",
  sort: "desc",
  sortBy: "id",
};

export function BusinessSection() {
  const [queryText, setQueryText] = useState("");
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const [dialogAction, setDialogAction] = useState<AdminAction | null>(null);
  const resource = getResource("business");
  const actions = getActions("business");
  const createAction = actions.find((action) => action.id === "business-create");
  const tokenAction = actions.find((action) => action.id === "token-history");
  const accessAction = actions.find((action) => action.id === "business-access");

  const overviewQuery = useQuery({
    queryKey: ["resourceOverview", "business"],
    queryFn: () => adminGet("/business/manage/overview"),
  });
  const listQuery = useQuery({
    queryKey: ["resourceList", "business", { page: "1", limit: "20" }],
    queryFn: () => adminGet("/business/manage", { page: "1", limit: "20" }),
  });

  const baseRows = useMemo(
    () => extractRows(listQuery.data).map(mapBusiness),
    [listQuery.data]
  );

  const tokenStatusQueries = useQueries({
    queries: baseRows.map((row) => ({
      queryKey: ["businessTokenStatus", row.id],
      queryFn: () => adminGet(`/generative-token/image-token/${row.id}/status`),
      enabled: Boolean(row.id && row.id !== "-"),
      retry: false,
    })),
  });
  const tokenHistoryQueries = useQueries({
    queries: baseRows.map((row) => ({
      queryKey: ["businessTokenHistory", row.id],
      queryFn: () => adminGet(`/generative-token/image-token/${row.id}`, tokenHistoryQuery),
      enabled: Boolean(row.id && row.id !== "-"),
      retry: false,
    })),
  });

  const rows = useMemo(() => {
    const mapped = baseRows.map((row, index) => {
      const available = tokenAvailable(tokenStatusQueries[index]?.data);
      const historyBalance = tokenBalanceFromHistory(tokenHistoryQueries[index]?.data);
      return {
        ...row,
        tokenBalance: available ?? historyBalance ?? row.tokenBalance,
        tokenLoading:
          (tokenStatusQueries[index]?.isLoading ?? false) ||
          (tokenHistoryQueries[index]?.isLoading ?? false),
      };
    });
    const text = queryText.toLowerCase();
    return mapped.filter((row) => {
      return (
        !text ||
        row.name.toLowerCase().includes(text) ||
        row.owner.toLowerCase().includes(text) ||
        row.plan.toLowerCase().includes(text)
      );
    });
  }, [baseRows, queryText, tokenHistoryQueries, tokenStatusQueries]);

  const totalBusiness =
    metricNumber(overviewQuery.data, ["total", "business"]) ||
    paginationTotal(listQuery.data) ||
    rows.length;
  const activeBusiness =
    metricNumber(overviewQuery.data, ["active", "business"]) ||
    rows.filter((row) => row.status === "active").length;
  const totalTokens =
    metricNumber(overviewQuery.data, ["total", "topup", "token"]) ||
    sumBy(rows, (row) => row.tokenBalance ?? 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Business Management"
        title="Kelola workspace bisnis"
        description="Pantau bisnis aktif, saldo token, paket, dan status operasional tanpa membuka detail teknis."
        action={
          createAction && (
            <Button onClick={() => setDialogAction(createAction)}>
              <Plus />
              Bisnis Baru
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Bisnis"
          value={formatNumber(totalBusiness)}
          icon={BriefcaseBusiness}
          tone="blue"
        />
        <MetricCard
          title="Bisnis Aktif"
          value={formatNumber(activeBusiness)}
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          title="Total Token Beredar"
          value={formatNumber(totalTokens)}
          icon={Coins}
          tone="amber"
        />
      </div>

      <Panel
        title="Daftar Bisnis"
        subtitle="Workspace pelanggan dan kondisi token"
        action={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              className="pl-9"
              placeholder="Cari bisnis atau owner"
            />
          </div>
        }
      >
        <DataTable<BusinessRow>
          rows={rows}
          isLoading={listQuery.isLoading}
          emptyLabel="Belum ada data bisnis dari API."
          columns={[
            {
              key: "business",
              header: "Nama Bisnis",
              render: (row) => <InlineValue primary={row.name} secondary={row.id} />,
            },
            {
              key: "owner",
              header: "Owner",
              render: (row) => row.owner,
            },
            {
              key: "plan",
              header: "Paket",
              render: (row) => <StatusBadge value={row.plan} />,
            },
            {
              key: "token",
              header: "Token Balance",
              className: "text-right",
              render: (row) =>
                row.tokenLoading
                  ? "..."
                  : row.tokenBalance === null
                    ? "-"
                    : formatNumber(row.tokenBalance),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge value={row.status} />,
            },
            {
              key: "action",
              header: "Aksi",
              render: (row) => (
                <div className="flex justify-end gap-2">
                  {accessAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(row.raw);
                        setDialogAction(accessAction);
                      }}
                    >
                      Akses
                    </Button>
                  )}
                  {tokenAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(row.raw);
                        setDialogAction(tokenAction);
                      }}
                    >
                      <Plus />
                      Token
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {dialogAction && resource && (
        <ActionDialog
          action={dialogAction}
          resource={resource}
          selected={selected}
          onClose={() => setDialogAction(null)}
        />
      )}
    </div>
  );
}

function mapBusiness(row: JsonRecord): BusinessRow {
  const status = getText(row, ["status"], "").toLowerCase();
  const hasIsActive = row.isActive !== undefined || row.active !== undefined;
  const isActive = getBoolean(row, ["isActive", "active"], false);

  return {
    id: getText(row, ["id", "businessRootId", "rootBusinessId"]),
    name: getText(row, ["name", "knowledge.name", "business.name"]),
    owner: getText(row, ["owner", "owner.name", "user.name", "profile.name"]),
    plan: getText(row, ["plan", "package", "subscription.plan"]),
    tokenBalance: getOptionalNumber(row, [
      "availableToken",
      "tokenBalance",
      "tokens",
      "balance",
      "totalToken",
      "totalTopupTokenAmount",
      "totalSuccessTopupTokenAmount",
    ]),
    tokenLoading: false,
    status: status || (hasIsActive ? (isActive ? "active" : "inactive") : "-"),
    raw: row,
  };
}

function getOptionalNumber(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const number = getNumber(row, [key], Number.NaN);
    if (Number.isFinite(number)) return number;
  }
  return null;
}
