import {
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  Headphones,
  LayoutDashboard,
  type LucideIcon,
  Users,
} from "lucide-react";
import { AdminSectionId } from "@/lib/admin-endpoints";

export type SectionMeta = {
  id: AdminSectionId;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
};

export const sectionMeta: Record<AdminSectionId, SectionMeta> = {
  dashboard: {
    id: "dashboard",
    label: "Overview",
    eyebrow: "Command Center",
    description: "Pantau revenue, user, bisnis, AI request, dan aktivitas terbaru.",
    icon: LayoutDashboard,
  },
  finance: {
    id: "finance",
    label: "Financing",
    eyebrow: "Revenue Ops",
    description: "Pantau transaksi, pendapatan, growth, dan status pembayaran.",
    icon: CircleDollarSign,
  },
  business: {
    id: "business",
    label: "Business Management",
    eyebrow: "Workspace",
    description: "Kelola bisnis, paket, token, status, dan akses workspace.",
    icon: BriefcaseBusiness,
  },
  users: {
    id: "users",
    label: "User Management",
    eyebrow: "People Ops",
    description: "Kelola user, admin, role, status aktif, dan akses akun.",
    icon: Users,
  },
  "ai-model": {
    id: "ai-model",
    label: "AI Model Management",
    eyebrow: "AI Control",
    description: "Aktifkan model, cek provider, dan buka pengaturan prompt.",
    icon: Bot,
  },
  crm: {
    id: "crm",
    label: "Service (CRM)",
    eyebrow: "Customer Care",
    description: "Tangani WhatsApp, email, ticket terbuka, dan prioritas support.",
    icon: Headphones,
  },
};

export const navItems: SectionMeta[] = [
  sectionMeta.dashboard,
  sectionMeta.finance,
  sectionMeta.business,
  sectionMeta.users,
  sectionMeta["ai-model"],
  sectionMeta.crm,
];

export const quickActionIds = [
  "business-create",
  "token-history",
  "user-create",
  "ai-create",
  "finance-income",
  "ticket-status",
];

export const providerTone: Record<string, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-100",
  anthropic: "bg-orange-50 text-orange-700 border-orange-100",
  google: "bg-blue-50 text-blue-700 border-blue-100",
  meta: "bg-violet-50 text-violet-700 border-violet-100",
};
