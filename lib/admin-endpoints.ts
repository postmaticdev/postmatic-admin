export type AdminSectionId =
  | "dashboard"
  | "business"
  | "users"
  | "ai-model"
  | "finance"
  | "crm";

export type AdminResource = {
  id: Exclude<AdminSectionId, "dashboard">;
  title: string;
  description: string;
  listPath: string;
  overviewPath?: string;
  detailPath?: string;
  defaultQuery?: Record<string, string>;
  primaryKeyHints: string[];
  columns: string[];
};

export type AdminAction = {
  id: string;
  section: Exclude<AdminSectionId, "dashboard">;
  title: string;
  method: "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  bodyTemplate?: unknown;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export const adminResources: AdminResource[] = [
  {
    id: "business",
    title: "Manage Business",
    description:
      "Workspace, akses bisnis, token injection, produk, avatar, member, knowledge, timezone, dan RSS.",
    listPath: "/business/manage",
    overviewPath: "/business/manage/overview",
    detailPath: "/business/manage/:businessRootId",
    defaultQuery: { page: "1", limit: "10" },
    primaryKeyHints: ["id", "businessRootId", "rootBusinessId"],
    columns: ["id", "name", "knowledge.name", "category", "createdAt"],
  },
  {
    id: "users",
    title: "Manage Admin/User/Creator",
    description:
      "CRUD user admin, akses user, role management, reset password, dan banned status.",
    listPath: "/user/manage",
    overviewPath: "/user/manage/overview",
    detailPath: "/user/manage/:profileId",
    defaultQuery: { role: "admin" },
    primaryKeyHints: ["id", "profileId"],
    columns: ["id", "name", "email", "role", "isBanned", "createdAt"],
  },
  {
    id: "ai-model",
    title: "Manage AI Model",
    description:
      "CRUD model generative image dan provider yang dipakai content generation.",
    listPath: "/app/generative-image-model",
    detailPath: "/app/generative-image-model/:generativeImageModelId",
    primaryKeyHints: ["id", "generativeImageModelId"],
    columns: ["id", "label", "model", "provider", "premiumModel", "isActive"],
  },
  {
    id: "finance",
    title: "Simple Finance",
    description:
      "Overview finance, ledger, income, expense, update, dan delete record.",
    listPath: "/finance/manage",
    overviewPath: "/finance/manage/overview",
    detailPath: "/finance/manage/:financeId",
    primaryKeyHints: ["id", "financeId"],
    columns: ["id", "type", "amount", "currency", "source", "createdAt"],
  },
  {
    id: "crm",
    title: "CRM",
    description:
      "Ticket WhatsApp, status ticket, dan kategori laporan/support.",
    listPath: "/ticket/whatsapp",
    primaryKeyHints: ["id", "ticketWhatsappId"],
    columns: ["id", "name", "phone", "email", "status", "createdAt"],
  },
];

export const adminActions: AdminAction[] = [
  {
    id: "business-create",
    section: "business",
    title: "Create New Business",
    method: "POST",
    path: "/business/manage",
    description: "Buat workspace baru lengkap dengan knowledge, role, dan produk awal.",
    bodyTemplate: {
      knowledge: {
        category: "",
        description: "",
        name: "",
        primaryLogoUrl: "",
        websiteUrl: "",
        colorTone: "",
        businessPhone: "",
        countryCode: "",
      },
      role: {
        hashtags: [],
        targetAudience: "",
        tone: "",
      },
      products: [
        {
          name: "",
          category: "",
          description: "",
          price: 0,
          currency: "",
          imageUrls: [],
        },
      ],
    },
  },
  {
    id: "business-access",
    section: "business",
    title: "Upsert Access Management",
    method: "POST",
    path: "/business/manage/:businessRootId/access-management",
    description: "Atur premium model, share requirement, dan watermark workspace.",
    bodyTemplate: {
      accessPremiumModel: false,
      isMustShareContent: true,
      isWatermarked: true,
    },
  },
  {
    id: "business-product-create",
    section: "business",
    title: "Create Business Product",
    method: "POST",
    path: "/business/manage/:businessRootId/product",
    description: "Tambah produk knowledge ke workspace.",
    bodyTemplate: {
      name: "",
      category: "",
      description: "",
      price: 0,
      currency: "",
      imageUrls: [],
    },
  },
  {
    id: "business-product-edit",
    section: "business",
    title: "Edit Business Product",
    method: "PUT",
    path: "/business/manage/:businessRootId/product/:businessProductId",
    description: "Update produk workspace.",
    bodyTemplate: {
      name: "",
      category: "",
      description: "",
      price: 0,
      currency: "",
      imageUrls: [],
    },
  },
  {
    id: "business-product-delete",
    section: "business",
    title: "Delete Business Product",
    method: "DELETE",
    path: "/business/manage/:businessRootId/product/:businessProductId",
    description: "Hapus produk workspace.",
    danger: true,
  },
  {
    id: "business-avatar-create",
    section: "business",
    title: "Create Business Avatar",
    method: "POST",
    path: "/business/manage/:businessRootId/avatar",
    description: "Tambah avatar untuk workspace.",
    bodyTemplate: {
      imageUrl: "",
      name: "",
    },
  },
  {
    id: "business-avatar-edit",
    section: "business",
    title: "Edit Business Avatar",
    method: "PUT",
    path: "/business/manage/:businessRootId/avatar/:businessAvatarId",
    description: "Update avatar workspace.",
    bodyTemplate: {
      imageUrl: "",
      name: "",
    },
  },
  {
    id: "business-avatar-delete",
    section: "business",
    title: "Delete Business Avatar",
    method: "DELETE",
    path: "/business/manage/:businessRootId/avatar/:businessAvatarId",
    description: "Hapus avatar workspace.",
    danger: true,
  },
  {
    id: "business-member-create",
    section: "business",
    title: "Create Member",
    method: "POST",
    path: "/business/manage/:businessRootId/member",
    description: "Tambahkan member ke workspace.",
    bodyTemplate: {
      email: "",
      role: "",
    },
  },
  {
    id: "business-member-edit",
    section: "business",
    title: "Edit Member Role",
    method: "PUT",
    path: "/business/manage/:businessRootId/member/:businessMemberId",
    description: "Ubah role member workspace.",
    bodyTemplate: {
      role: "",
    },
  },
  {
    id: "business-member-delete",
    section: "business",
    title: "Delete Member",
    method: "DELETE",
    path: "/business/manage/:businessRootId/member/:businessMemberId",
    description: "Hapus member workspace.",
    danger: true,
  },
  {
    id: "business-knowledge",
    section: "business",
    title: "Upsert Knowledge",
    method: "POST",
    path: "/business/manage/:businessRootId/knowledge",
    description: "Update business knowledge.",
    bodyTemplate: {
      category: "",
      description: "",
      name: "",
      primaryLogoUrl: "",
      websiteUrl: "",
      colorTone: "",
      businessPhone: "",
      countryCode: "",
    },
  },
  {
    id: "business-timezone",
    section: "business",
    title: "Upsert Timezone",
    method: "POST",
    path: "/business/manage/:businessRootId/timezone",
    description: "Atur timezone workspace.",
    bodyTemplate: {
      timezone: "",
    },
  },
  {
    id: "business-rss-create",
    section: "business",
    title: "Create RSS Subscription",
    method: "POST",
    path: "/business/manage/:businessRootId/rss-subscription",
    description: "Tambah RSS subscription workspace.",
    bodyTemplate: {
      appRssFeedId: 0,
      isActive: true,
      title: "",
    },
  },
  {
    id: "business-rss-edit",
    section: "business",
    title: "Edit RSS Subscription",
    method: "PUT",
    path: "/business/manage/:businessRootId/rss-subscription/:businessRssSubscriptionId",
    description: "Update RSS subscription workspace.",
    bodyTemplate: {
      appRssFeedId: 0,
      isActive: true,
      title: "",
    },
  },
  {
    id: "business-rss-delete",
    section: "business",
    title: "Delete RSS Subscription",
    method: "DELETE",
    path: "/business/manage/:businessRootId/rss-subscription/:businessRssSubscriptionId",
    description: "Hapus RSS subscription workspace.",
    danger: true,
  },
  {
    id: "token-history",
    section: "business",
    title: "History Token Injection",
    method: "POST",
    path: "/generative-token/image-token/injection",
    description: "Gunakan action Inject Token untuk menambah token; history tampil dari endpoint GET.",
    bodyTemplate: {
      businessRootId: 0,
      amount: 0,
    },
  },
  {
    id: "user-create",
    section: "users",
    title: "Create User/Admin",
    method: "POST",
    path: "/user/manage",
    description: "Buat user baru. Gunakan role admin untuk akses dashboard admin.",
    bodyTemplate: {
      email: "",
      name: "",
      password: "",
      role: "",
    },
  },
  {
    id: "user-reset-password",
    section: "users",
    title: "Reset Password",
    method: "PUT",
    path: "/user/manage/:profileId/reset-password",
    description: "Reset password user.",
    bodyTemplate: {
      newPassword: "",
    },
  },
  {
    id: "user-update-role",
    section: "users",
    title: "Update Role",
    method: "PUT",
    path: "/user/manage/:profileId/update-role",
    description: "Ubah role user/admin/creator.",
    bodyTemplate: {
      role: "",
    },
  },
  {
    id: "user-ban",
    section: "users",
    title: "Ban User",
    method: "PUT",
    path: "/user/manage/:profileId/banned",
    description: "Aktifkan atau nonaktifkan banned status.",
    bodyTemplate: {
      isBanned: true,
    },
    danger: true,
  },
  {
    id: "ai-create",
    section: "ai-model",
    title: "Create New Model",
    method: "POST",
    path: "/app/generative-image-model",
    description: "Tambah model generative image baru.",
    bodyTemplate: {
      premiumModel: false,
      label: "",
      model: "",
      provider: "",
      validRatios: [],
      imageSizes: [],
      isActive: false,
    },
  },
  {
    id: "ai-edit",
    section: "ai-model",
    title: "Edit Model",
    method: "PUT",
    path: "/app/generative-image-model/:generativeImageModelId",
    description: "Update model generative image.",
    bodyTemplate: {
      model: "",
      label: "",
      image: null,
      provider: "",
      isActive: true,
      premiumModel: false,
      validRatios: [],
      imageSizes: null,
    },
  },
  {
    id: "ai-delete",
    section: "ai-model",
    title: "Delete Model",
    method: "DELETE",
    path: "/app/generative-image-model/:generativeImageModelId",
    description: "Hapus model generative image.",
    danger: true,
  },
  {
    id: "ai-prompt",
    section: "ai-model",
    title: "Edit Processing Prompt",
    method: "PUT",
    path: "/app/generative-image-model/:generativeImageModelId/processing-prompt",
    description:
      "Placeholder dari scope dashboard. Endpoint ini belum ada eksplisit di Postman ADMIN ONLY.",
    bodyTemplate: {
      processingPrompt: "",
    },
    disabled: true,
    disabledReason: "Endpoint processing prompt belum ditemukan di Postman collection.",
  },
  {
    id: "finance-income",
    section: "finance",
    title: "Create Income",
    method: "POST",
    path: "/finance/manage/income",
    description: "Tambah income manual/partner/adjustment.",
    bodyTemplate: {
      amount: 0,
      currency: "",
      source: "",
      note: "",
    },
  },
  {
    id: "finance-expense",
    section: "finance",
    title: "Create Expense",
    method: "POST",
    path: "/finance/manage/expense",
    description: "Tambah expense creator_payout/referral_payout/operational/adjustment/manual/partner.",
    bodyTemplate: {
      amount: 0,
      currency: "",
      source: "",
      note: "",
    },
  },
  {
    id: "finance-update",
    section: "finance",
    title: "Update Finance Record",
    method: "PUT",
    path: "/finance/manage/:financeId",
    description: "Update finance record non-system.",
    bodyTemplate: {
      amount: 0,
    },
  },
  {
    id: "finance-delete",
    section: "finance",
    title: "Delete Finance Record",
    method: "DELETE",
    path: "/finance/manage/:financeId",
    description: "Hapus finance record dengan alasan.",
    bodyTemplate: {
      reason: "",
    },
    danger: true,
  },
  {
    id: "ticket-category-create",
    section: "crm",
    title: "Create Ticket Category",
    method: "POST",
    path: "/ticket/category",
    description: "Tambah kategori laporan/support.",
    bodyTemplate: {
      name: "",
    },
  },
  {
    id: "ticket-category-edit",
    section: "crm",
    title: "Edit Ticket Category",
    method: "PUT",
    path: "/ticket/category/:ticketCategoryId",
    description: "Update kategori ticket.",
    bodyTemplate: {
      name: "",
    },
  },
  {
    id: "ticket-category-delete",
    section: "crm",
    title: "Delete Ticket Category",
    method: "DELETE",
    path: "/ticket/category/:ticketCategoryId",
    description: "Hapus kategori ticket.",
    danger: true,
  },
  {
    id: "ticket-status",
    section: "crm",
    title: "Edit Whatsapp Ticket Status",
    method: "PUT",
    path: "/ticket/whatsapp/:ticketWhatsappId/status",
    description: "Status: open, pending, in_progress, resolved.",
    bodyTemplate: {
      status: "",
    },
  },
];

export const dashboardCards = [
  {
    id: "business",
    title: "Workspace",
    path: "/business/manage/overview",
    section: "business" as const,
  },
  {
    id: "users",
    title: "User",
    path: "/user/manage/overview",
    section: "users" as const,
  },
  {
    id: "finance",
    title: "Finance",
    path: "/finance/manage/overview",
    section: "finance" as const,
  },
];

export function getResource(section: Exclude<AdminSectionId, "dashboard">) {
  return adminResources.find((resource) => resource.id === section);
}

export function getActions(section: Exclude<AdminSectionId, "dashboard">) {
  return adminActions.filter((action) => action.section === section);
}

export function extractPathParams(path: string) {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
}

export function buildPath(path: string, params: Record<string, string>) {
  return extractPathParams(path).reduce((nextPath, key) => {
    return nextPath.replace(`:${key}`, encodeURIComponent(params[key] ?? ""));
  }, path);
}
