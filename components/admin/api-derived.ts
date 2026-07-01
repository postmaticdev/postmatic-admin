import { BaseResponse, JsonRecord } from "@/types/api";
import { getNestedValue } from "@/lib/utils";

export type DailyPoint = {
  label: string;
  value: number;
  count: number;
};

export function metricNumber(
  payload: unknown,
  keys: string[],
  fallback = 0
) {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (!data || typeof data !== "object") return fallback;

  const found = findNumber(data as JsonRecord, keys);
  return found ?? fallback;
}

export function paginationTotal(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const total = Number(
    (payload as { pagination?: { total?: unknown } }).pagination?.total
  );
  return Number.isFinite(total) ? total : null;
}

export function tokenAvailable(payload: unknown) {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (!data || typeof data !== "object") return null;
  return firstFiniteNumber(data as JsonRecord, [
    "availableToken",
    "available_token",
    "tokenBalance",
    "token_balance",
  ]);
}

export function tokenTotal(payload: unknown) {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (!data || typeof data !== "object") return null;
  return firstFiniteNumber(data as JsonRecord, [
    "totalToken",
    "total_token",
    "totalTopupTokenAmount",
    "totalSuccessTopupTokenAmount",
  ]);
}

export function tokenBalanceFromHistory(payload: unknown) {
  const rows = recordsFromPayload(payload);
  if (!rows.length) return null;

  const balance = rows.reduce((total, row) => {
    const amount = firstFiniteNumber(row, ["amount", "tokenAmount", "productAmount"]);
    if (amount === null) return total;

    const type = String(row.type ?? row.entryType ?? row.direction ?? "").toLowerCase();
    const source = String(row.source ?? row.bonusType ?? "").toLowerCase();
    const intent = `${type} ${source}`;

    if (
      ["out", "used", "usage", "deduct", "debit", "spend", "consume"].some((word) =>
        intent.includes(word)
      )
    ) {
      return total - amount;
    }

    return total + amount;
  }, 0);

  return Number.isFinite(balance) ? balance : null;
}

export function buildDailySeries<T>(
  rows: T[],
  getDate: (row: T) => string,
  getValue: (row: T) => number,
  days = 30
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = toDateKey(date);
    return {
      key,
      label: String(date.getDate()),
      value: 0,
      count: 0,
    };
  });

  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  rows.forEach((row) => {
    const rawDate = getDate(row);
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const bucket = bucketByKey.get(toDateKey(date));
    if (!bucket) return;
    bucket.value += getValue(row);
    bucket.count += 1;
  });

  return buckets.map(({ label, value, count }) => ({ label, value, count }));
}

export function latestActivity<T>(
  rows: T[],
  getTitle: (row: T) => string,
  getDate: (row: T) => string,
  limit = 5
) {
  return rows
    .map((row) => ({
      title: getTitle(row),
      date: getDate(row),
      time: new Date(getDate(row)).getTime(),
    }))
    .filter((item) => item.title && Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time)
    .slice(0, limit);
}

function findNumber(source: JsonRecord, keys: string[]): number | undefined {
  const entries = Object.entries(source);
  const exact = entries.find(([key, value]) => {
    const lowered = key.toLowerCase();
    return keys.every((keyword) => lowered.includes(keyword)) && isNumeric(value);
  });
  if (exact) return Number(exact[1]);

  const partial = entries.find(([key, value]) => {
    const lowered = key.toLowerCase();
    return keys.some((keyword) => lowered.includes(keyword)) && isNumeric(value);
  });
  if (partial) return Number(partial[1]);

  for (const value of Object.values(source)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = findNumber(value as JsonRecord, keys);
    if (nested !== undefined) return nested;
  }

  const nestedByPath = keys
    .map((key) => getNestedValue(source, key))
    .find(isNumeric);
  return nestedByPath === undefined ? undefined : Number(nestedByPath);
}

function recordsFromPayload(payload: unknown) {
  const data = (payload as BaseResponse | undefined)?.data ?? payload;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];

  const nested = [
    data.data,
    data.items,
    data.rows,
    data.records,
    data.transactions,
    data.histories,
    data.results,
    data.list,
  ].find(Array.isArray);

  return Array.isArray(nested) ? nested.filter(isRecord) : [data];
}

function firstFiniteNumber(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = getNestedValue(source, key);
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNumeric(value: unknown) {
  return Number.isFinite(Number(value));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
