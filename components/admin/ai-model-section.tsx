"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Plus, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminAction, getActions, getResource } from "@/lib/admin-endpoints";
import { adminGet, adminMutate, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { cn, getNestedValue } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import { providerTone } from "./data";
import {
  EmptyState,
  formatNumber,
  getBoolean,
  getText,
  MetricCard,
  SectionHeader,
  StatusBadge,
} from "./shared";

type AiModelRow = {
  id: string;
  label: string;
  model: string;
  provider: string;
  isActive: boolean;
  premiumModel: boolean;
  raw: JsonRecord;
};

export function AiModelSection() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const [dialogAction, setDialogAction] = useState<AdminAction | null>(null);
  const [updatingModelId, setUpdatingModelId] = useState("");
  const resource = getResource("ai-model");
  const actions = getActions("ai-model");
  const createAction = actions.find((action) => action.id === "ai-create");
  const editAction = actions.find((action) => action.id === "ai-edit");
  const deleteAction = actions.find((action) => action.id === "ai-delete");

  const listQuery = useQuery({
    queryKey: ["resourceList", "ai-model"],
    queryFn: () => adminGet("/app/generative-image-model"),
  });

  const models = useMemo(() => {
    const apiRows = extractRows(listQuery.data);
    return apiRows.map(mapAiModel);
  }, [listQuery.data]);

  const activeCount = models.filter((model) => model.isActive).length;
  const premiumCount = models.filter((model) => model.premiumModel).length;
  const toggleMutation = useMutation({
    mutationFn: (model: AiModelRow) => {
      setUpdatingModelId(model.id);
      return adminMutate({
        method: "PUT",
        path: "/app/generative-image-model/:generativeImageModelId",
        params: { generativeImageModelId: model.id },
        body: buildAiModelUpdateBody(model, !model.isActive),
      });
    },
    onSuccess: (data, model) => {
      toast.success(
        data.responseMessage ??
          `${model.label} ${model.isActive ? "dinonaktifkan" : "diaktifkan"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["resourceList", "ai-model"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetric"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      setUpdatingModelId("");
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI Model Management"
        title="Kontrol model AI"
        description="Aktifkan model yang dipakai produk, lihat provider, dan buka pengaturan model tanpa melihat response mentah."
        action={
          createAction && (
            <Button onClick={() => setDialogAction(createAction)}>
              <Plus />
              Model Baru
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Model" value={formatNumber(models.length)} icon={Bot} tone="blue" />
        <MetricCard
          title="Model Aktif"
          value={formatNumber(activeCount)}
          icon={Sparkles}
          tone="green"
        />
        <MetricCard
          title="Premium Model"
          value={formatNumber(premiumCount)}
          icon={Settings2}
          tone="amber"
        />
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Memuat daftar model...
        </div>
      ) : models.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => (
          <article
            key={model.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-600">
                  <Bot className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">
                    {model.label}
                  </h2>
                  <p className="mt-1 truncate text-sm text-slate-500">{model.model}</p>
                </div>
              </div>
              <div className="flex h-7 items-center">
                {updatingModelId === model.id ? (
                  <Loader2 className="size-5 animate-spin text-slate-500" />
                ) : (
                  <Switch
                    checked={model.isActive}
                    disabled={toggleMutation.isPending || model.id === "-"}
                    onCheckedChange={() => toggleMutation.mutate(model)}
                    aria-label={`Ubah status ${model.label}`}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium",
                  providerTone[model.provider.toLowerCase()] ??
                    "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {model.provider}
              </span>
              <div className="flex items-center gap-2">
                {model.premiumModel && <StatusBadge value="premium" />}
                <StatusBadge value={model.isActive ? "active" : "inactive"} />
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {editAction && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelected(model.raw);
                    setDialogAction(editAction);
                  }}
                >
                  <Settings2 />
                  Settings
                </Button>
              )}
              {deleteAction && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelected(model.raw);
                    setDialogAction(deleteAction);
                  }}
                >
                  Hapus
                </Button>
              )}
            </div>
          </article>
          ))}
        </div>
      ) : (
        <EmptyState label="Belum ada data AI model dari API." />
      )}

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

function buildAiModelUpdateBody(model: AiModelRow, nextIsActive: boolean) {
  return {
    model: getText(model.raw, ["model"], model.model),
    label: getText(model.raw, ["label", "name"], model.label),
    image: getNullable(model.raw, ["image"]),
    provider: getText(model.raw, ["provider"], model.provider),
    isActive: nextIsActive,
    premiumModel: getBoolean(model.raw, ["premiumModel", "isPremium"], model.premiumModel),
    validRatios: getArray(model.raw, ["validRatios"], []),
    imageSizes: getArray(model.raw, ["imageSizes"], null),
  };
}

function mapAiModel(row: JsonRecord): AiModelRow {
  return {
    id: getText(row, ["id", "generativeImageModelId", "model"]),
    label: getText(row, ["label", "name"]),
    model: getText(row, ["model", "type"]),
    provider: getText(row, ["provider"]),
    isActive: getBoolean(row, ["isActive", "active"], false),
    premiumModel: getBoolean(row, ["premiumModel", "isPremium"], false),
    raw: row,
  };
}

function getNullable(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = getNestedValue(row, key);
    if (value !== undefined) return value;
  }
  return null;
}

function getArray(row: JsonRecord, keys: string[], fallback: unknown[] | null) {
  for (const key of keys) {
    const value = getNestedValue(row, key);
    if (Array.isArray(value)) return value;
    if (value === null) return null;
  }
  return fallback;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Status model gagal diubah.";
}
