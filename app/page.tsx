"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminAppShell } from "@/components/admin/app-shell";
import { AccessDenied, FullScreenState, LoginScreen } from "@/components/admin/auth-screens";
import { AiModelSection } from "@/components/admin/ai-model-section";
import { BusinessSection } from "@/components/admin/business-section";
import { CrmSection } from "@/components/admin/crm-section";
import { FinanceSection } from "@/components/admin/finance-section";
import { OverviewSection } from "@/components/admin/overview-section";
import { UsersSection } from "@/components/admin/users-section";
import { hasStoredAuthToken, setAuthToken } from "@/config/api";
import { ACCESS_TOKEN_KEY, LOGIN_URL, REFRESH_TOKEN_KEY } from "@/constants";
import { AdminSectionId } from "@/lib/admin-endpoints";
import { adminGet, getProfile } from "@/services/admin.api";
import { JsonRecord } from "@/types/api";

export default function AdminHome() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>("dashboard");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromParam = params.get(ACCESS_TOKEN_KEY);
    const refreshFromParam = params.get(REFRESH_TOKEN_KEY);

    if (tokenFromParam || refreshFromParam) {
      const accessToken = tokenFromParam ?? localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken =
        refreshFromParam ?? localStorage.getItem(REFRESH_TOKEN_KEY);

      setAuthToken(accessToken, refreshToken);
      queryClient.clear();

      fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: tokenFromParam,
          refreshToken: refreshFromParam,
        }),
      }).catch(() => undefined);

      window.history.replaceState({}, "", window.location.pathname);
    }

    setAuthReady(true);
  }, [queryClient]);

  const isAuthenticated = authReady && hasStoredAuthToken();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });

  const adminProbeQuery = useQuery({
    queryKey: ["adminProbe"],
    queryFn: () => adminGet("/user/manage/overview"),
    enabled: isAuthenticated,
  });

  const logout = () => {
    setAuthToken(null, null);
    queryClient.clear();
    fetch("/api/auth/sync", { method: "DELETE" }).catch(() => undefined);
    window.location.href = LOGIN_URL;
  };

  if (!authReady) {
    return <FullScreenState label="Menyiapkan dashboard admin" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const adminDenied =
    adminProbeQuery.isError &&
    !adminProbeQuery.isLoading &&
    !adminProbeQuery.isFetching;
  const profile = profileQuery.data?.data as JsonRecord | undefined;

  return (
    <AdminAppShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      profile={profile}
      onLogout={logout}
      onRefresh={() => queryClient.invalidateQueries()}
    >
      {adminDenied ? (
        <AccessDenied />
      ) : (
        <ActiveSection
          activeSection={activeSection}
          onOpenSection={setActiveSection}
        />
      )}
    </AdminAppShell>
  );
}

function ActiveSection({
  activeSection,
  onOpenSection,
}: {
  activeSection: AdminSectionId;
  onOpenSection: (section: AdminSectionId) => void;
}) {
  switch (activeSection) {
    case "finance":
      return <FinanceSection />;
    case "business":
      return <BusinessSection />;
    case "users":
      return <UsersSection />;
    case "ai-model":
      return <AiModelSection />;
    case "crm":
      return <CrmSection />;
    default:
      return <OverviewSection onOpenSection={onOpenSection} />;
  }
}
