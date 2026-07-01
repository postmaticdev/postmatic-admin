"use client";

import { Ban, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOGIN_URL } from "@/constants";
import { redirectToLogin } from "@/config/api";
import { FullScreenState } from "./shared";

export { FullScreenState };

export function LoginScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white">
        <CardHeader>
          <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-slate-950 text-white">
            <ShieldCheck />
          </div>
          <CardTitle className="text-2xl text-slate-950">Postmatic Admin</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Masuk sebagai admin untuk membuka dashboard operasional Postmatic.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={redirectToLogin}>
            <LogIn />
            Login via auth-staging
          </Button>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Auth URL: {LOGIN_URL}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-red-100 bg-white">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-md bg-red-50 text-red-700">
            <Ban />
          </div>
          <CardTitle className="text-slate-950">Akses admin belum aktif</CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Token login terbaca, tetapi backend menolak akses admin. Pastikan akun
            yang dipakai sudah diberi role admin di sistem auth.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
