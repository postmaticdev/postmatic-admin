"use client";

import { ReactNode, useState } from "react";
import { LogOut, Menu, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminSectionId } from "@/lib/admin-endpoints";
import { JsonRecord } from "@/types/api";
import { cn } from "@/lib/utils";
import { navItems, sectionMeta } from "./data";
import { getInitials } from "./shared";

export function AdminAppShell({
  activeSection,
  onSectionChange,
  profile,
  onLogout,
  onRefresh,
  children,
}: {
  activeSection: AdminSectionId;
  onSectionChange: (section: AdminSectionId) => void;
  profile?: JsonRecord;
  onLogout: () => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;
  const profileName = String(profile?.name ?? "Admin");
  const profileEmail = String(profile?.email ?? "Authenticated");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-950 text-lg font-semibold text-white">
                P
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-950">Postmatic.id</div>
                <div className="truncate text-xs text-slate-500">Admin Dashboard</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Tutup navigasi"
            >
              <X />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Platform
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={cn(
                      "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    )}
                    onClick={() => {
                      onSectionChange(item.id);
                      setMobileNavOpen(false);
                    }}
                    type="button"
                  >
                    <Icon className="size-4" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-md bg-slate-50 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-slate-700 shadow-sm">
                {getInitials(profileName)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-950">
                  {profileName}
                </div>
                <div className="truncate text-xs text-slate-500">{profileEmail}</div>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onLogout}>
              <LogOut />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          aria-label="Tutup overlay navigasi"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      )}

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu />
            </Button>
            <div className="hidden size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 sm:flex">
              <ActiveIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-950 sm:text-lg">
                {activeMeta.label}
              </div>
              <div className="truncate text-xs text-slate-500">
                {activeMeta.eyebrow}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
              <ShieldCheck className="size-4" />
              Admin aktif
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw />
              Refresh
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
