"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminAction,
  AdminResource,
  buildPath,
  extractPathParams,
} from "@/lib/admin-endpoints";
import { adminMutate } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { getNestedValue, humanizeKey } from "@/lib/utils";
import { MethodBadge } from "./shared";

type BodyField = {
  path: string[];
  label: string;
  kind: "text" | "number" | "boolean" | "list" | "json";
  value: string;
};

export function ActionDialog({
  action,
  selected,
  resource,
  onClose,
}: {
  action: AdminAction;
  selected: JsonRecord | null;
  resource: AdminResource;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const pathParams = useMemo(() => extractPathParams(action.path), [action.path]);
  const fallbackId = getPrimaryId(selected, resource.primaryKeyHints);
  const [params, setParams] = useState<Record<string, string>>(() =>
    inferParams(action.path, selected, fallbackId)
  );
  const [fields, setFields] = useState<BodyField[]>(() =>
    hydrateFields(buildFields(action.bodyTemplate), selected, fallbackId)
  );

  const mutation = useMutation({
    mutationFn: () =>
      adminMutate({
        method: action.method,
        path: action.path,
        params,
        body: fields.length ? buildBody(fields) : undefined,
      }),
    onSuccess: (data) => {
      toast.success(data.responseMessage ?? "Operasi berhasil diproses.");
      queryClient.invalidateQueries({ queryKey: ["resourceList"] });
      queryClient.invalidateQueries({ queryKey: ["resourceOverview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetric"] });
      onClose();
    },
  });

  const missingParams = pathParams.filter((param) => !params[param]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={action.method} />
              {action.danger && (
                <span className="rounded-md border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  Perlu hati-hati
                </span>
              )}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {action.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {action.disabledReason ?? action.description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-5">
          {pathParams.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-950">
                Tujuan operasi
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pathParams.map((param) => (
                  <label key={param} className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      {friendlyLabel(param)}
                    </span>
                    <Input
                      value={params[param] ?? ""}
                      onChange={(event) =>
                        setParams((current) => ({
                          ...current,
                          [param]: event.target.value,
                        }))
                      }
                      placeholder={param}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-950">
                Data yang diubah
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field, index) => (
                  <BodyFieldInput
                    key={field.path.join(".")}
                    field={field}
                    onChange={(value) =>
                      setFields((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value } : item
                        )
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              Info teknis request
            </summary>
            <code className="mt-2 block break-all text-xs">
              {action.method} {buildPath(action.path, params)}
            </code>
          </details>

          {mutation.error && (
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {stringifyError(mutation.error)}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={action.danger ? "destructive" : "default"}
            disabled={mutation.isPending || missingParams.length > 0 || action.disabled}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            Jalankan
          </Button>
        </div>
      </section>
    </div>
  );
}

function BodyFieldInput({
  field,
  onChange,
}: {
  field: BodyField;
  onChange: (value: string) => void;
}) {
  const fullWidth = field.kind === "list" || field.kind === "json";

  if (field.kind === "boolean") {
    return (
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          value={field.value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Pilih</option>
          <option value="true">Aktif / Ya</option>
          <option value="false">Nonaktif / Tidak</option>
        </select>
      </label>
    );
  }

  if (field.kind === "list" || field.kind === "json") {
    return (
      <label className={fullWidth ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <Textarea
          className="min-h-28 font-sans"
          value={field.value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.kind === "list" ? "Satu item per baris" : "Data lanjutan"}
        />
      </label>
    );
  }

  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <Input
        type={field.kind === "number" ? "number" : "text"}
        value={field.value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function getPrimaryId(row: JsonRecord | null, hints: string[]) {
  if (!row) return "";
  for (const hint of hints) {
    const value = getNestedValue(row, hint);
    if (value != null) return String(value);
  }
  if (row.id != null) return String(row.id);
  return "";
}

export function inferParams(
  path: string,
  row: JsonRecord | null,
  fallbackId: string
) {
  const entries = extractPathParams(path).map((param) => {
    const exact = row ? getNestedValue(row, param) : undefined;
    const lowered = param.toLowerCase();
    const value =
      exact ??
      (lowered.includes("businessroot") ? fallbackId : undefined) ??
      (lowered.includes("profile") ? fallbackId : undefined) ??
      (lowered.includes("finance") ? fallbackId : undefined) ??
      (lowered.includes("generativeimagemodel") ? fallbackId : undefined) ??
      (lowered.includes("ticketwhatsapp") ? fallbackId : undefined) ??
      "";
    return [param, String(value)] as const;
  });
  return Object.fromEntries(entries);
}

function buildFields(template: unknown, path: string[] = []): BodyField[] {
  if (template === undefined) return [];
  if (!template || typeof template !== "object") {
    return [fieldFromValue(path, template)];
  }
  if (Array.isArray(template)) {
    return [fieldFromValue(path, template)];
  }

  return Object.entries(template as JsonRecord).flatMap(([key, value]) =>
    buildFields(value, [...path, key])
  );
}

function hydrateFields(
  fields: BodyField[],
  selected: JsonRecord | null,
  fallbackId: string
) {
  return fields.map((field) => {
    const key = field.path.at(-1) ?? "";
    const selectedValue = selected ? getNestedValue(selected, key) : undefined;
    const lowered = key.toLowerCase();
    const value =
      selectedValue ??
      (lowered.includes("businessroot") ? fallbackId : undefined) ??
      (lowered.includes("profile") ? fallbackId : undefined) ??
      (lowered.includes("finance") ? fallbackId : undefined) ??
      (lowered.includes("generativeimagemodel") ? fallbackId : undefined) ??
      (lowered.includes("ticketwhatsapp") ? fallbackId : undefined);

    if (value === undefined || value === null || value === "") return field;
    return { ...field, value: String(value) };
  });
}

function fieldFromValue(path: string[], value: unknown): BodyField {
  const label = path.map(humanizeKey).join(" - ");
  if (typeof value === "number") {
    return { path, label, kind: "number", value: "" };
  }
  if (typeof value === "boolean") {
    return { path, label, kind: "boolean", value: "" };
  }
  if (Array.isArray(value)) {
    const primitiveList = value.every(
      (item) => item == null || ["string", "number", "boolean"].includes(typeof item)
    );
    return {
      path,
      label,
      kind: primitiveList ? "list" : "json",
      value: "",
    };
  }
  return { path, label, kind: "text", value: "" };
}

function buildBody(fields: BodyField[]) {
  const body: JsonRecord = {};
  fields.forEach((field) => {
    setDeepValue(body, field.path, parseField(field));
  });
  return body;
}

function parseField(field: BodyField) {
  if (field.kind === "number") {
    if (field.value === "") return undefined;
    const numeric = Number(field.value);
    return Number.isFinite(numeric) ? numeric : field.value;
  }
  if (field.kind === "boolean") {
    if (field.value === "") return undefined;
    return field.value === "true";
  }
  if (field.kind === "list") {
    if (!field.value.trim()) return [];
    return field.value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (field.kind === "json") {
    if (!field.value.trim()) return undefined;
    return JSON.parse(field.value);
  }
  return field.value;
}

function setDeepValue(target: JsonRecord, path: string[], value: unknown) {
  let current = target;
  path.forEach((part, index) => {
    if (index === path.length - 1) {
      current[part] = value;
      return;
    }
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as JsonRecord;
  });
}

function friendlyLabel(param: string) {
  const labels: Record<string, string> = {
    businessRootId: "Business ID",
    businessProductId: "Product ID",
    businessAvatarId: "Avatar ID",
    businessMemberId: "Member ID",
    businessRssSubscriptionId: "RSS Subscription ID",
    profileId: "User ID",
    financeId: "Finance ID",
    generativeImageModelId: "AI Model ID",
    ticketWhatsappId: "WhatsApp Ticket ID",
    ticketCategoryId: "Kategori Ticket ID",
  };
  return labels[param] ?? humanizeKey(param);
}

function stringifyError(error: unknown) {
  if (!error) return "Operasi gagal.";
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
