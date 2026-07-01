"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Hash,
  Inbox,
  Loader2,
  MessageCircle,
  Send,
  TicketCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACCESS_TOKEN_KEY, NEXT_PUBLIC_API_ORIGIN } from "@/constants";
import { AdminAction, getActions, getResource } from "@/lib/admin-endpoints";
import { adminGet, adminMutate, extractRows } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";
import { cn, getNestedValue } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import {
  AvatarInitials,
  DataTable,
  dateLabel,
  EmptyState,
  formatNumber,
  FullWidthLoading,
  getText,
  InlineValue,
  MetricCard,
  Panel,
  SectionHeader,
  SegmentedControl,
  StatusBadge,
} from "./shared";

type CrmTab = "whatsapp" | "table";

type TicketRow = {
  id: string;
  channel: string;
  subject: string;
  body: string;
  sender: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  priority: string;
  roomId: string;
  attachmentsCount: number;
  raw: JsonRecord;
};

type WhatsappMessage = {
  id: string;
  body: string;
  senderType: string;
  senderName: string;
  mediaUrl: string;
  mediaMimeType: string;
  createdAt: string;
};

type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected";

type RealtimeEnvelope = {
  type?: string;
  topic?: string;
  data?: JsonRecord;
  sentAt?: string;
};

export function CrmSection() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CrmTab>("whatsapp");
  const [activeTicketId, setActiveTicketId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const [dialogAction, setDialogAction] = useState<AdminAction | null>(null);
  const resource = getResource("crm");
  const ticketStatusAction = getActions("crm").find(
    (action) => action.id === "ticket-status"
  );

  const ticketQuery = useQuery({
    queryKey: ["resourceList", "crm", { page: "1", limit: "10" }],
    queryFn: () => adminGet("/ticket/whatsapp", { page: "1", limit: "10" }),
  });

  const tickets = useMemo(() => {
    const apiRows = extractRows(ticketQuery.data);
    return apiRows.map(mapTicket);
  }, [ticketQuery.data]);

  const activeTicket =
    tickets.find((ticket) => ticket.id === activeTicketId) ?? tickets[0];
  const activeRoomId = activeTicket?.roomId ?? "";
  const hasActiveRoom = Boolean(activeRoomId && activeRoomId !== "-");

  const messageQuery = useQuery({
    queryKey: ["whatsappMessages", activeRoomId],
    queryFn: () => adminGet(`/chat/whatsapp/${activeRoomId}`, { limit: "50" }),
    enabled: hasActiveRoom,
  });

  const messages = useMemo(
    () =>
      extractRows(messageQuery.data)
        .map(mapWhatsappMessage)
        .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt)),
    [messageQuery.data]
  );

  useEffect(() => {
    setReplyText("");
  }, [activeTicket?.id]);

  const replyMutation = useMutation({
    mutationFn: () =>
      adminMutate({
        method: "POST",
        path: `/chat/whatsapp/${activeRoomId}/reply`,
        body: { body: replyText.trim() },
      }),
    onSuccess: (data) => {
      toast.success(data.responseMessage ?? "Balasan WhatsApp terkirim.");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["whatsappMessages", activeRoomId] });
      queryClient.invalidateQueries({ queryKey: ["resourceList", "crm"] });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  const totalTickets = getPaginationTotal(ticketQuery.data) ?? tickets.length;
  const openTickets = tickets.filter((ticket) =>
    ["open", "pending", "in_progress"].includes(ticket.status)
  ).length;
  const activeRooms = new Set(
    tickets.map((ticket) => ticket.roomId).filter((roomId) => roomId !== "-")
  ).size;
  const highPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "high"
  ).length;
  const canReply =
    Boolean(hasActiveRoom && replyText.trim()) && !replyMutation.isPending;

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEnvelope) => {
      const type = event.type ?? "";
      const roomId = roomIdFromEvent(event);

      if (type.startsWith("ticket.")) {
        queryClient.invalidateQueries({ queryKey: ["resourceList", "crm"] });
      }

      if (type === "chat.whatsapp.room.upserted") {
        queryClient.invalidateQueries({ queryKey: ["resourceList", "crm"] });
      }

      if (
        type === "chat.whatsapp.message.created" ||
        type === "chat.whatsapp.message.updated"
      ) {
        queryClient.invalidateQueries({ queryKey: ["resourceList", "crm"] });

        if (roomId && roomId === activeRoomId) {
          const message = getNestedValue(event.data, "message");
          if (message && typeof message === "object" && !Array.isArray(message)) {
            upsertMessageCache(
              queryClient,
              activeRoomId,
              message as JsonRecord,
              type === "chat.whatsapp.message.updated"
            );
          }
          queryClient.invalidateQueries({
            queryKey: ["whatsappMessages", activeRoomId],
          });
        }
      }
    },
    [activeRoomId, queryClient]
  );

  const realtimeStatus = useWhatsappRealtime({
    activeRoomId: hasActiveRoom ? activeRoomId : "",
    activeTicketId: activeTicket?.id ?? "",
    onEvent: handleRealtimeEvent,
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Service (CRM)"
        title="Pusat bantuan pelanggan"
        description="Pantau percakapan WhatsApp, keluhan email, prioritas ticket, dan status penanganan dari satu area kerja."
        action={<RealtimeBadge status={realtimeStatus} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Ticket WhatsApp"
          value={formatNumber(totalTickets)}
          icon={Inbox}
          tone="blue"
        />
        <MetricCard
          title="Ticket Open"
          value={formatNumber(openTickets)}
          icon={MessageCircle}
          tone="red"
        />
        <MetricCard
          title="Room Chat Aktif"
          value={formatNumber(activeRooms)}
          icon={Hash}
          tone="amber"
        />
        <MetricCard
          title="Prioritas High"
          value={formatNumber(highPriorityTickets)}
          icon={TicketCheck}
          tone="ink"
        />
      </div>

      <SegmentedControl<CrmTab>
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "table", label: "Tabel Ticket" },
        ]}
      />

      {activeTab === "whatsapp" ? (
        <div className="grid min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[20rem_1fr]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            {ticketQuery.isLoading ? (
              <div className="p-4">
                <FullWidthLoading />
              </div>
            ) : tickets.length ? (
              tickets.map((ticket) => {
                const active = ticket.id === activeTicket?.id;
                return (
                  <button
                    key={ticket.id}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50",
                      active && "bg-slate-50"
                    )}
                    onClick={() => setActiveTicketId(ticket.id)}
                    type="button"
                  >
                    <AvatarInitials name={ticket.subject} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-950">
                          #{ticket.id} {ticket.subject}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dateLabel(ticket.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {ticket.body}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        <StatusBadge value={ticket.status} />
                        <StatusBadge value={ticket.priority} />
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-4">
                <EmptyState label="Tidak ada ticket WhatsApp dari endpoint." />
              </div>
            )}
          </div>

          <div className="flex min-h-[520px] flex-col">
            {activeTicket ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarInitials name={activeTicket.subject} />
                    <InlineValue
                      primary={activeTicket.subject}
                      secondary={`${activeTicket.channel} - Room #${activeTicket.roomId}`}
                    />
                  </div>
                  {ticketStatusAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(activeTicket.raw);
                        setDialogAction(ticketStatusAction);
                      }}
                    >
                      Ubah Status
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 p-4">
                  <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <StatusBadge value={activeTicket.status} />
                      <StatusBadge value={activeTicket.priority} />
                      {activeTicket.attachmentsCount > 0 && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {activeTicket.attachmentsCount} lampiran
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-slate-800">
                      {activeTicket.body}
                    </p>
                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <TicketMeta label="Pengirim" value={activeTicket.sender} />
                      <TicketMeta label="Dibuat" value={dateLabel(activeTicket.createdAt)} />
                      <TicketMeta label="Diupdate" value={dateLabel(activeTicket.updatedAt)} />
                      <TicketMeta label="Ticket ID" value={activeTicket.id} />
                    </dl>
                  </div>

                  {!hasActiveRoom ? (
                    <EmptyState label="Ticket ini belum terhubung ke room WhatsApp." />
                  ) : messageQuery.isLoading ? (
                    <FullWidthLoading />
                  ) : messages.length ? (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <WhatsappBubble key={message.id} message={message} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState label="Belum ada pesan WhatsApp dari room ini." />
                  )}
                </div>

                <form
                  className="border-t border-slate-200 bg-white p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (canReply) replyMutation.mutate();
                  }}
                >
                  <div className="flex gap-3">
                    <Textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      className="min-h-12 resize-none font-sans"
                      placeholder="Tulis balasan WhatsApp..."
                      disabled={!hasActiveRoom || replyMutation.isPending}
                    />
                    <Button className="h-12 shrink-0" disabled={!canReply} type="submit">
                      {replyMutation.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                      Kirim
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-4">
                <EmptyState label="Pilih ticket WhatsApp untuk melihat detail." />
              </div>
            )}
          </div>
        </div>
      ) : (
        <Panel title="Daftar Ticket WhatsApp" subtitle="Data dari GET /ticket/whatsapp">
          <DataTable<TicketRow>
            rows={tickets}
            isLoading={ticketQuery.isLoading}
            columns={[
              {
                key: "id",
                header: "ID",
                render: (row) => <span className="font-medium text-slate-950">{row.id}</span>,
              },
              {
                key: "subject",
                header: "Subject",
                render: (row) => <InlineValue primary={row.subject} secondary={row.body} />,
              },
              {
                key: "sender",
                header: "Pengirim",
                render: (row) => row.sender,
              },
              {
                key: "createdAt",
                header: "Tanggal",
                render: (row) => dateLabel(row.createdAt),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "priority",
                header: "Prioritas",
                render: (row) => <StatusBadge value={row.priority} />,
              },
              {
                key: "action",
                header: "Aksi",
                render: (row) =>
                  ticketStatusAction ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(row.raw);
                        setDialogAction(ticketStatusAction);
                      }}
                    >
                      Status
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Panel>
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

function useWhatsappRealtime({
  activeRoomId,
  activeTicketId,
  onEvent,
}: {
  activeRoomId: string;
  activeTicketId: string;
  onEvent: (event: RealtimeEnvelope) => void;
}) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = getStoredAccessToken();
    if (!token) {
      setStatus("disconnected");
      return;
    }

    const topics = [
      "chat.whatsapp.admin",
      "ticket.admin",
      activeRoomId ? `chat.whatsapp.room.${activeRoomId}` : "",
      activeTicketId ? `ticket.${activeTicketId}` : "",
    ].filter(Boolean);

    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;
    let closedByEffect = false;
    let reconnectAttempt = 0;

    const connect = () => {
      setStatus("connecting");

      try {
        socket = new WebSocket(buildRealtimeUrl(token));
      } catch {
        setStatus("disconnected");
        return;
      }

      socket.onopen = () => {
        reconnectAttempt = 0;
        setStatus("connected");
        socket?.send(JSON.stringify({ type: "subscribe", topics }));
        heartbeat = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };

      socket.onmessage = (message) => {
        const envelope = parseRealtimeMessage(message.data);
        if (!envelope?.type || envelope.type.startsWith("realtime.")) return;
        onEventRef.current(envelope);
      };

      socket.onerror = () => {
        setStatus("disconnected");
      };

      socket.onclose = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (closedByEffect) return;

        setStatus("disconnected");
        const delay = Math.min(1000 * 2 ** reconnectAttempt, 10_000);
        reconnectAttempt += 1;
        reconnect = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnect) clearTimeout(reconnect);
      socket?.close();
    };
  }, [activeRoomId, activeTicketId]);

  return status;
}

function mapTicket(row: JsonRecord): TicketRow {
  const roomId = getText(row, ["whatsappRoomChatId"], "-");
  const email = getText(row, ["email"], "");
  const phone = getText(row, ["phone"], "");
  const profileId = getText(row, ["profileId"], "");

  return {
    id: getText(row, ["id", "ticketWhatsappId", "code"], "T-000"),
    channel: getText(row, ["channel"], "whatsapp"),
    subject: getText(row, ["subject", "message", "name"], "Keluhan pelanggan"),
    body: getText(row, ["body", "message", "description"], "-"),
    sender: email || phone || profileId || `Room #${roomId}`,
    createdAt: getText(row, ["createdAt", "date"], "-"),
    updatedAt: getText(row, ["updatedAt"], "-"),
    status: getText(row, ["slaStatus", "status"], "open").toLowerCase(),
    priority: getText(row, ["priority"], "medium").toLowerCase(),
    roomId,
    attachmentsCount: Array.isArray(row.attachments) ? row.attachments.length : 0,
    raw: row,
  };
}

function RealtimeBadge({ status }: { status: RealtimeStatus }) {
  const connected = status === "connected";
  const connecting = status === "connecting";
  const Icon = connected ? Wifi : WifiOff;
  const label = connected ? "Realtime aktif" : connecting ? "Menghubungkan" : "Realtime off";

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium",
        connected
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : connecting
            ? "border-amber-100 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-white text-slate-500"
      )}
    >
      <Icon className="size-4" />
      {label}
    </div>
  );
}

function mapWhatsappMessage(row: JsonRecord): WhatsappMessage {
  const id = getText(row, ["id", "messageId"], "");
  const body = getText(row, ["body", "message", "content"], "");
  const createdAt = getText(row, ["createdAt", "sentAt", "date"], "-");

  return {
    id: id || `${createdAt}-${body}`,
    body,
    senderType: getText(row, ["senderType"], "customer").toLowerCase(),
    senderName: getText(row, ["profile.name", "sender.name", "senderName"], ""),
    mediaUrl: getText(row, ["mediaUrl", "attachment", "attachmentUrl"], ""),
    mediaMimeType: getText(row, ["mediaMimeType", "mimeType"], ""),
    createdAt,
  };
}

function WhatsappBubble({ message }: { message: WhatsappMessage }) {
  const fromAgent = message.senderType === "agent";
  const senderLabel = message.senderName || (fromAgent ? "Admin" : "Customer");

  return (
    <div className={cn("flex", fromAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm",
          fromAgent
            ? "bg-slate-950 text-white"
            : "border border-slate-200 bg-white text-slate-800"
        )}
      >
        <div
          className={cn(
            "mb-1 text-xs font-semibold",
            fromAgent ? "text-slate-300" : "text-slate-500"
          )}
        >
          {senderLabel}
        </div>
        {message.body ? (
          <p className="whitespace-pre-wrap leading-6">{message.body}</p>
        ) : (
          <p className={cn("leading-6", fromAgent ? "text-slate-300" : "text-slate-500")}>
            Pesan media
          </p>
        )}
        {message.mediaUrl && (
          <a
            className={cn(
              "mt-2 inline-flex text-xs font-semibold underline-offset-2 hover:underline",
              fromAgent ? "text-white" : "text-slate-950"
            )}
            href={message.mediaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Buka lampiran {message.mediaMimeType ? `(${message.mediaMimeType})` : ""}
          </a>
        )}
        <div className={cn("mt-2 text-[11px]", fromAgent ? "text-slate-300" : "text-slate-400")}>
          {dateTimeLabel(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

function TicketMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function dateTimeLabel(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaginationTotal(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const pagination = (payload as { pagination?: { total?: unknown } }).pagination;
  const total = Number(pagination?.total);
  return Number.isFinite(total) ? total : null;
}

function roomIdFromEvent(event: RealtimeEnvelope) {
  const candidates = [
    getNestedValue(event.data, "whatsappRoomChatId"),
    getNestedValue(event.data, "message.whatsappRoomChatId"),
    getNestedValue(event.data, "room.id"),
  ];
  const found = candidates.find((value) => value !== undefined && value !== null);
  return found === undefined || found === null ? "" : String(found);
}

function upsertMessageCache(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId: string,
  message: JsonRecord,
  replaceOnly: boolean
) {
  queryClient.setQueryData(["whatsappMessages", roomId], (current: unknown) => {
    const rows = extractRows(current);
    const nextId = getText(message, ["id", "messageId"], "");
    const existingIndex = rows.findIndex((row) => {
      const rowId = getText(row, ["id", "messageId"], "");
      return rowId && nextId && rowId === nextId;
    });

    const nextRows =
      existingIndex >= 0
        ? rows.map((row, index) => (index === existingIndex ? { ...row, ...message } : row))
        : replaceOnly
          ? rows
          : [...rows, message];

    if (current && typeof current === "object" && !Array.isArray(current)) {
      return { ...(current as JsonRecord), data: nextRows };
    }

    return { data: nextRows };
  });
}

function getStoredAccessToken() {
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACCESS_TOKEN_KEY}=`))
    ?.split("=")[1];
  return (
    (cookieToken ? decodeURIComponent(cookieToken) : "") ||
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    ""
  );
}

function buildRealtimeUrl(token: string) {
  const url = new URL("/api/realtime/ws", NEXT_PUBLIC_API_ORIGIN);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("postmaticAccessToken", token);
  return url.toString();
}

function parseRealtimeMessage(data: unknown): RealtimeEnvelope | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as RealtimeEnvelope;
  } catch {
    return null;
  }
}

function timestamp(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Balasan WhatsApp gagal dikirim.";
}
