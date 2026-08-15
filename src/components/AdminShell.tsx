import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { useAuth, type AdminRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Ringkasan", role: "admin_super" as AdminRole },
  { to: "/admin/moderation", label: "Moderasi", role: "admin_moderator" as AdminRole },
  { to: "/admin/finance", label: "Keuangan", role: "admin_finance" as AdminRole },
  { to: "/admin/affiliates", label: "Afiliasi", role: "admin_affiliate" as AdminRole },
] as const;

export function AdminNav() {
  const { hasRole } = useAuth();
  return (
    <nav className="flex flex-wrap gap-2">
      {NAV.filter((item) => hasRole(item.role)).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/admin" }}
          className={cn(
            "rounded-xl border px-3 py-1.5 text-sm font-medium text-muted-foreground",
            "hover:bg-muted",
          )}
          activeProps={{ className: "border-primary bg-primary/10 text-primary" }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminGate({ role, children }: { role: AdminRole; children: ReactNode }) {
  const { loading, isAdmin, hasRole } = useAuth();

  if (loading) return <div className="p-10 text-center text-sm">Memuat…</div>;

  if (!isAdmin || !hasRole(role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Konsol ini hanya untuk peran internal yang berwenang. Setiap aksi juga diverifikasi
          ulang di server.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
