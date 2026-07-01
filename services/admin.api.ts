import { api } from "@/config/api";
import { buildPath } from "@/lib/admin-endpoints";
import { BaseResponse, JsonRecord } from "@/types/api";

export type QueryParams = Record<string, string | number | boolean | undefined>;

function cleanQuery(query?: QueryParams) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

function withQuery(path: string, query?: QueryParams) {
  const serialized = cleanQuery(query);
  return serialized ? `${path}?${serialized}` : path;
}

export function adminGet<T = unknown>(path: string, query?: QueryParams) {
  return api.get<BaseResponse<T>>(withQuery(path, query)).then((res) => res.data);
}

export function adminMutate({
  method,
  path,
  params,
  body,
}: {
  method: "POST" | "PUT" | "DELETE";
  path: string;
  params?: Record<string, string>;
  body?: unknown;
}) {
  const resolvedPath = buildPath(path, params ?? {});
  if (method === "POST") {
    return api.post<BaseResponse>(resolvedPath, body).then((res) => res.data);
  }
  if (method === "PUT") {
    return api.put<BaseResponse>(resolvedPath, body).then((res) => res.data);
  }
  return api
    .delete<BaseResponse>(resolvedPath, body ? { data: body } : undefined)
    .then((res) => res.data);
}

export function getProfile() {
  return adminGet<JsonRecord>("/account/profile");
}

export function extractRows(payload: unknown): JsonRecord[] {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (Array.isArray(data)) return data as JsonRecord[];
  if (!data || typeof data !== "object") return [];

  const record = data as JsonRecord;
  const candidates = [
    record.items,
    record.rows,
    record.records,
    record.businesses,
    record.users,
    record.data,
    record.result,
    record.results,
    record.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as JsonRecord[];
  }

  return [record];
}

export function extractMetricEntries(payload: unknown) {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (!data || typeof data !== "object") return [];

  return Object.entries(data as JsonRecord).filter(([, value]) => {
    return ["number", "string", "boolean"].includes(typeof value) || value == null;
  });
}
