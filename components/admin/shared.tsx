"use client";

import * as React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber, getNestedValue } from "@/lib/utils";
import { JsonRecord } from "@/types/api";

type MetricCardProps = {
  title: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "ink" | "green" | "blue" | "amber" | "red";
};

const toneClass = {
  ink: "bg-slate-950 text-white",
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
};

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "ink",
}: MetricCardProps) {
  return (
    <Card className="min-h-28 border-slate-200 bg-white">
      <CardContent className="flex h-full items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-3 truncate text-2xl font-semibold tracking-normal text-slate-950">
            {value}
          </div>
          {helper && (
            <div className="mt-2 text-xs font-medium text-emerald-700">
              {helper}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            toneClass[tone]
          )}
        >
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-slate-200 bg-white", className)}>
      <CardHeader className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base text-slate-950">{title}</CardTitle>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">{children}</CardContent>
    </Card>
  );
}

export function StatusBadge({ value }: { value: unknown }) {
  const normalized = String(value ?? "-").toLowerCase().replace(/\s+/g, "_");
  const label = humanStatus(normalized);
  const cls =
    normalized === "active" ||
    normalized === "success" ||
    normalized === "resolved"
      ? "border-slate-950 bg-slate-950 text-white"
      : normalized === "pending" ||
          normalized === "in_progress" ||
          normalized === "medium"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : normalized === "failed" ||
            normalized === "suspended" ||
            normalized === "open" ||
            normalized === "high" ||
            normalized === "banned"
          ? "border-red-100 bg-red-50 text-red-700"
          : normalized === "low"
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return <Badge className={cn("capitalize", cls)}>{label}</Badge>;
}

export function MethodBadge({ method }: { method: string }) {
  const tone =
    method === "DELETE"
      ? "border-red-100 bg-red-50 text-red-700"
      : method === "PUT"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-emerald-100 bg-emerald-50 text-emerald-700";

  return <Badge className={tone}>{method}</Badge>;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            className={cn(
              "h-8 rounded px-3 text-sm font-medium text-slate-600 transition-colors",
              active && "bg-white text-slate-950 shadow-sm"
            )}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  isLoading,
  emptyLabel = "Data tidak ditemukan",
}: {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  isLoading?: boolean;
  emptyLabel?: string;
}) {
  if (isLoading) return <FullWidthLoading />;
  if (!rows.length) return <EmptyState label={emptyLabel} />;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3 align-middle", column.className)}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AreaChart({
  values,
  labels,
  color = "#0f172a",
  fill = "#e2e8f0",
  id = "area-chart",
  suffix = "",
}: {
  values: number[];
  labels?: string[];
  color?: string;
  fill?: string;
  id?: string;
  suffix?: string;
}) {
  const width = 720;
  const height = 240;
  const padding = 28;
  const { linePath, areaPath, yLabels } = buildAreaPaths(
    values,
    width,
    height,
    padding
  );
  const gradientId = `${id}-fill`;

  return (
    <div className="h-[280px] w-full overflow-hidden rounded-md bg-white">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafik tren"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line * (height - padding * 2)) / 3;
          return (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="4 4"
            />
          );
        })}
        {values.map((_, index) => {
          const x =
            padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
          return (
            <line
              key={index}
              x1={x}
              x2={x}
              y1={padding}
              y2={height - padding}
              stroke="#f1f5f9"
            />
          );
        })}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.5" />
        {yLabels.map((label, index) => (
          <text
            key={label}
            x="4"
            y={padding + (index * (height - padding * 2)) / 3 + 4}
            fill="#94a3b8"
            fontSize="11"
          >
            {label}
            {suffix}
          </text>
        ))}
        {(labels?.length ? labelTicks(labels) : ["1", "5", "10", "15", "20", "25", "30"]).map((day) => {
          const dayIndex = labels?.length ? labels.indexOf(day) : Number(day) - 1;
          const x =
            padding + (dayIndex * (width - padding * 2)) / Math.max(values.length - 1, 1);
          return (
            <text key={day} x={x - 3} y={height - 6} fill="#94a3b8" fontSize="11">
              {day}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function BarChart({
  values,
  labels,
  color = "#0f766e",
}: {
  values: number[];
  labels?: string[];
  color?: string;
}) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-[280px] items-end gap-1 rounded-md bg-white px-4 pb-8 pt-4">
      {values.map((value, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${Math.max((value / max) * 210, 10)}px`,
              backgroundColor: color,
              opacity: 0.62 + (value / max) * 0.38,
            }}
          />
          {(index + 1) % 4 === 2 && (
            <span className="text-[10px] leading-none text-slate-400">
              {labels?.[index] ?? index + 1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function AvatarInitials({ name }: { name: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
      {getInitials(name)}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {label}
    </div>
  );
}

export function FullWidthLoading() {
  return (
    <div className="flex h-48 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
      <Loader2 className="size-5 animate-spin text-slate-500" />
    </div>
  );
}

export function FullScreenState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <Loader2 className="size-4 animate-spin text-slate-500" />
        {label}
      </div>
    </div>
  );
}

export function InlineValue({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-slate-950">{primary}</div>
      {secondary && <div className="mt-0.5 truncate text-xs text-slate-500">{secondary}</div>}
    </div>
  );
}

export function formatRupiah(value: unknown) {
  return formatCurrency(value).replace(/\s/g, " ");
}

export function getText(
  row: JsonRecord | undefined,
  keys: string[],
  fallback = "-"
) {
  if (!row) return fallback;
  for (const key of keys) {
    const value = getNestedValue(row, key);
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

export function getNumber(
  row: JsonRecord | undefined,
  keys: string[],
  fallback = 0
) {
  if (!row) return fallback;
  for (const key of keys) {
    const value = getNestedValue(row, key);
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return fallback;
}

export function getBoolean(
  row: JsonRecord | undefined,
  keys: string[],
  fallback = false
) {
  if (!row) return fallback;
  for (const key of keys) {
    const value = getNestedValue(row, key);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
  }
  return fallback;
}

export function dateLabel(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function sumBy<T>(rows: T[], getter: (row: T) => number) {
  return rows.reduce((total, row) => total + getter(row), 0);
}

export function asRecords(rows: unknown[]): JsonRecord[] {
  return rows.filter((row): row is JsonRecord => Boolean(row && typeof row === "object"));
}

export function humanStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "AD";
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function rowKey(row: unknown, index: number) {
  if (row && typeof row === "object") {
    const record = row as JsonRecord;
    return String(record.id ?? record.uuid ?? record.email ?? record.name ?? index);
  }
  return String(index);
}

function buildAreaPaths(
  values: number[],
  width: number,
  height: number,
  padding: number
) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const yFor = (value: number) =>
    height - padding - ((value - min) / range) * (height - padding * 2);
  const xFor = (index: number) =>
    padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => [xFor(index), yFor(value)] as const);
  const linePath = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${
    height - padding
  } Z`;
  const yLabels = [max, min + (range * 2) / 3, min + range / 3, min].map((label) =>
    Number(label.toFixed(0)).toLocaleString("id-ID")
  );

  return { linePath, areaPath, yLabels };
}

function labelTicks(labels: string[]) {
  if (labels.length <= 7) return labels;
  const indexes = [0, 4, 9, 14, 19, 24, labels.length - 1].filter(
    (index, position, array) => index >= 0 && index < labels.length && array.indexOf(index) === position
  );
  return indexes.map((index) => labels[index]);
}

export { formatNumber };
