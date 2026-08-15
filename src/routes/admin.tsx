import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { rupiah, timeAgo } from "@/lib/format";
import {
  fetchEnterpriseProfiles,
  type Escrow,
  type Report,
  type Withdrawal,
} from "@/lib/queries";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Konsol Admin — DoIt4Me" },
      {
        name: "description",
        content:
          "Konsol internal untuk moderasi sengketa, arus dana escrow, penarikan, dan verifikasi badge institusi.",
      },
      { property: "og:title", content: "Konsol Admin — DoIt4Me" },
      {
        property: "og:description",
        content: "Dashboard peran: super admin, moderasi, keuangan, dan afiliasi.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, hasRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const reportsQ = useQuery({
    queryKey: ["admin", "reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const escrowQ = useQuery({
    queryKey: ["admin", "escrow"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions_escrow")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Escrow[];
    },
  });

  const withdrawalsQ = useQuery({
    queryKey: ["admin", "withdrawals"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const enterprisesQ = useQuery({
    queryKey: ["admin", "enterprises"],
    enabled: isAdmin,
    queryFn: fetchEnterpriseProfiles,
  });

  if (loading) return <div className="p-10 text-center text-sm">Memuat…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto size-8 text-destructive" />
        <h1 className="mt-3 text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya untuk tim internal DoIt4Me.
        </p>
      </div>
    );
  }

  const gmv = (escrowQ.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  const commission = (escrowQ.data ?? []).reduce((sum, e) => sum + Number(e.commission), 0);

  async function setReportStatus(id: string, status: string) {
    await supabase.from("reports").update({ status }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
  }

  async function setEscrowStatus(id: string, status: Escrow["status"]) {
    await supabase.from("transactions_escrow").update({ status }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["admin", "escrow"] });
  }

  async function setWithdrawalStatus(id: string, status: string) {
    await supabase.from("withdrawals").update({ status }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
  }

  async function setBadgeStatus(id: string, badge_status: string) {
    await supabase.from("enterprise_profiles").update({ badge_status }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["admin", "enterprises"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Konsol Admin</h1>
      <p className="text-sm text-muted-foreground">
        Peran aktif:{" "}
        {(["admin_super", "admin_moderator", "admin_finance", "admin_affiliate"] as const)
          .filter((r) => hasRole(r))
          .join(", ") || "—"}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="GMV escrow" value={rupiah(gmv)} />
        <Stat label="Komisi platform" value={rupiah(commission)} />
        <Stat label="Laporan terbuka" value={String((reportsQ.data ?? []).filter((r) => r.status === "open").length)} />
      </div>

      <Tabs defaultValue="moderation" className="mt-6">
        <TabsList>
          <TabsTrigger value="moderation">Moderasi</TabsTrigger>
          <TabsTrigger value="finance">Keuangan</TabsTrigger>
          <TabsTrigger value="affiliates">Afiliasi</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation">
          <Card className="divide-y p-0">
            {(reportsQ.data ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <Badge variant="secondary">{r.target_type}</Badge>
                <span className="min-w-0 flex-1 truncate">
                  {r.reason} — {r.target_preview ?? "tanpa pratinjau"}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                <Badge>{r.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => void setReportStatus(r.id, "resolved")}>
                  Selesaikan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void setReportStatus(r.id, "dismissed")}>
                  Abaikan
                </Button>
              </div>
            ))}
            {(reportsQ.data ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Tidak ada laporan.</p>
            )}
          </Card>

          <Card className="mt-4 divide-y p-0">
            <p className="p-3 text-sm font-semibold">Sengketa escrow</p>
            {(escrowQ.data ?? [])
              .filter((e) => e.status === "DISPUTED")
              .map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="flex-1">{e.dispute_reason ?? "Sengketa"}</span>
                  <span>{rupiah(Number(e.amount))}</span>
                  <Button size="sm" onClick={() => void setEscrowStatus(e.id, "RELEASED")}>
                    Lepas ke pekerja
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setEscrowStatus(e.id, "REFUNDED")}
                  >
                    Refund klien
                  </Button>
                </div>
              ))}
            {(escrowQ.data ?? []).filter((e) => e.status === "DISPUTED").length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Tidak ada sengketa aktif.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card className="divide-y p-0">
            {(withdrawalsQ.data ?? []).map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="flex-1">{rupiah(Number(w.amount))}</span>
                <span className="text-muted-foreground">
                  {w.method} · {w.account_ref ?? "—"}
                </span>
                <Badge>{w.status}</Badge>
                <Button size="sm" onClick={() => void setWithdrawalStatus(w.id, "paid")}>
                  Tandai dibayar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void setWithdrawalStatus(w.id, "rejected")}
                >
                  Tolak
                </Button>
              </div>
            ))}
            {(withdrawalsQ.data ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Belum ada permintaan penarikan.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="affiliates">
          <Card className="divide-y p-0">
            {(enterprisesQ.data ?? []).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="flex-1 font-medium">{e.legal_name}</span>
                <Badge variant="secondary">{e.badge_kind}</Badge>
                <Badge>{e.badge_status}</Badge>
                <Button size="sm" onClick={() => void setBadgeStatus(e.id, "verified")}>
                  Verifikasi badge
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void setBadgeStatus(e.id, "rejected")}>
                  Tolak
                </Button>
              </div>
            ))}
            {(enterprisesQ.data ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Belum ada mitra institusi.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </Card>
  );
}
