"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminAction, getActions, getResource } from "@/lib/admin-endpoints";
import { adminGet, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { ActionDialog } from "./action-dialog";
import { metricNumber, paginationTotal } from "./api-derived";
import {
  AvatarInitials,
  DataTable,
  dateLabel,
  formatNumber,
  getBoolean,
  getText,
  InlineValue,
  MetricCard,
  Panel,
  SectionHeader,
  SegmentedControl,
  StatusBadge,
} from "./shared";

type UserTab = "user" | "admin";

type UserRow = {
  id: string;
  name: string;
  email: string;
  business: string;
  role: string;
  status: string;
  registeredAt: string;
  raw: JsonRecord;
};

export function UsersSection() {
  const [activeTab, setActiveTab] = useState<UserTab>("user");
  const [queryText, setQueryText] = useState("");
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const [dialogAction, setDialogAction] = useState<AdminAction | null>(null);
  const resource = getResource("users");
  const actions = getActions("users");
  const createAction = actions.find((action) => action.id === "user-create");
  const resetAction = actions.find((action) => action.id === "user-reset-password");
  const roleAction = actions.find((action) => action.id === "user-update-role");
  const banAction = actions.find((action) => action.id === "user-ban");

  const overviewQuery = useQuery({
    queryKey: ["resourceOverview", "users"],
    queryFn: () => adminGet("/user/manage/overview"),
  });
  const listQuery = useQuery({
    queryKey: ["resourceList", "users", activeTab],
    queryFn: () => adminGet("/user/manage", { role: activeTab }),
  });

  const rows = useMemo(() => {
    const apiRows = extractRows(listQuery.data);
    const mapped = apiRows.map(mapUser);
    const text = queryText.toLowerCase();
    return mapped.filter((row) => {
      const tabMatch = row.role.toLowerCase() === activeTab;
      const searchMatch =
        !text ||
        row.name.toLowerCase().includes(text) ||
        row.email.toLowerCase().includes(text) ||
        row.business.toLowerCase().includes(text);
      return tabMatch && searchMatch;
    });
  }, [activeTab, listQuery.data, queryText]);

  const totalUsers =
    metricNumber(overviewQuery.data, ["total", "user"]) ||
    paginationTotal(listQuery.data) ||
    rows.length;
  const activeUsers =
    metricNumber(overviewQuery.data, ["active", "user"]) ||
    rows.filter((row) => row.status === "active").length;
  const totalAdmins =
    metricNumber(overviewQuery.data, ["admin"]) ||
    (activeTab === "admin" ? rows.length : 0);
  const newUsers =
    metricNumber(overviewQuery.data, ["new", "user"]) || countRecentUsers(rows);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="User Management"
        title="Kelola akses pengguna"
        description="Cari user, cek bisnis terkait, ubah role, reset password, dan atur status akun dari satu layar."
        action={
          createAction && (
            <Button onClick={() => setDialogAction(createAction)}>
              <Plus />
              User Baru
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total User" value={formatNumber(totalUsers)} icon={Users} tone="blue" />
        <MetricCard
          title="User Aktif"
          value={formatNumber(activeUsers)}
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          title="Total Admin"
          value={formatNumber(totalAdmins)}
          icon={ShieldCheck}
          tone="ink"
        />
        <MetricCard
          title="New User (30 hari)"
          value={formatNumber(newUsers)}
          icon={UserPlus}
          tone="amber"
        />
      </div>

      <Panel
        title="Manajemen Pengguna"
        action={
          <div className="grid gap-2 sm:grid-cols-[auto_16rem]">
            <SegmentedControl<UserTab>
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                className="pl-9"
                placeholder="Cari nama atau email"
              />
            </div>
          </div>
        }
      >
        <DataTable<UserRow>
          rows={rows}
          isLoading={listQuery.isLoading}
          emptyLabel="Belum ada data pengguna dari API."
          columns={[
            {
              key: "name",
              header: "Nama",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <AvatarInitials name={row.name} />
                  <InlineValue primary={row.name} secondary={row.email} />
                </div>
              ),
            },
            {
              key: "business",
              header: "Bisnis",
              render: (row) => row.business,
            },
            {
              key: "role",
              header: "Role",
              render: (row) => <StatusBadge value={row.role} />,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge value={row.status} />,
            },
            {
              key: "date",
              header: "Tanggal Daftar",
              render: (row) => dateLabel(row.registeredAt),
            },
            {
              key: "action",
              header: "Aksi",
              render: (row) => (
                <div className="flex justify-end gap-2">
                  {roleAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAction(row, roleAction)}
                    >
                      Role
                    </Button>
                  )}
                  {resetAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAction(row, resetAction)}
                    >
                      Reset
                    </Button>
                  )}
                  {banAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAction(row, banAction)}
                    >
                      Ban
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

  function openAction(row: UserRow, action: AdminAction) {
    setSelected(row.raw);
    setDialogAction(action);
  }
}

function mapUser(row: JsonRecord): UserRow {
  const isBanned = getBoolean(row, ["isBanned", "banned"], false);
  const isActive = getBoolean(row, ["isActive", "active"], true);
  return {
    id: getText(row, ["id", "profileId"]),
    name: getText(row, ["name", "profile.name"]),
    email: getText(row, ["email", "profile.email"]),
    business: getText(row, ["business", "business.name", "workspace.name"]),
    role: getText(row, ["role", "type"], "user").toLowerCase(),
    status: isBanned ? "banned" : isActive ? "active" : "inactive",
    registeredAt: getText(row, ["registeredAt", "createdAt"], "-"),
    raw: row,
  };
}

function countRecentUsers(rows: UserRow[]) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  return rows.filter((row) => {
    const date = new Date(row.registeredAt);
    return !Number.isNaN(date.getTime()) && date >= threshold;
  }).length;
}
