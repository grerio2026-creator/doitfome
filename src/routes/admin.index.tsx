import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminGate } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminPlatformStats, grantRole, revokeRole } from "@/lib/admin.functions";
import type { AdminRole } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import type { ProfileRow } from "@/lib/queries";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Ringkasan Platform — Konsol Admin DoIt4Me" },
      {
        name: "description",
        content: "Statistik platform dan manajemen peran internal DoIt4Me.",
      },
      { property: "og:title", content: "Ringkasan Platform — Konsol Admin DoIt4Me" },
      { property: "og:description", content: "Statistik platform dan manajemen peran internal." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminGate role="admin_super">
      <OverviewPage />
    </AdminGate>
  ),
});

const ROLES: AdminRole[] = ["admin_super", "admin_moderator", "admin_finance", "admin_affiliate"];

function OverviewPage() {
  const queryClient = useQueryClient();
  const stats = useServerFn(adminPlatformStats);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const [term, setTerm] = useState("");
  const [role, setRole] = useState<AdminRole>("admin_moderator");
  const [busy, setBusy] = useState(false);

  const statsQ = useQuery({ queryKey: ["admin", "stats"], queryFn: () => stats({}) });

  const peopleQ = useQuery({
    queryKey: ["admin", "people", term],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").limit(12);
      if (term.trim()) query = query.ilike("full_name", `%${term.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: AdminRole }[];
    },
  });

  async function mutateRole(userId: string, action: "grant" | "revoke") {
    setBusy(true);
    try {
      if (action === "grant") await grant({ data: { userId, role } });
      else await revoke({ data: { userId, role } });
      toast.success(action === "grant" ? "Peran diberikan" : "Peran dicabut");
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui peran");
    } finally {
      setBusy(false);
    }
  }

  const s = statsQ.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Total pengguna" value={String(s?.total_users ?? 0)} />
        <Stat label="Pekerja" value={String(s?.total_workers ?? 0)} />
        <Stat label="Pekerjaan aktif" value={String(s?.open_jobs ?? 0)} />
        <Stat label="Pekerjaan selesai" value={String(s?.completed_jobs ?? 0)} />
        <Stat label="Total pekerjaan" value={String(s?.total_jobs ?? 0)} />
        <Stat label="GMV escrow" value={rupiah(Number(s?.gmv ?? 0))} />
        <Stat label="Komisi platform" value={rupiah(Number(s?.commission ?? 0))} />
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Manajemen pengguna & peran</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Cari nama pengguna…"
            className="max-w-xs"
          />
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 divide-y">
          {(peopleQ.data ?? []).map((p) => {
            const owned = (rolesQ.data ?? [])
              .filter((r) => r.user_id === p.id)
              .map((r) => r.role);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{p.full_name}</span>
                <Badge variant="secondary">{p.kind}</Badge>
                {owned.map((r) => (
                  <Badge key={r}>{r}</Badge>
                ))}
                <Button size="sm" disabled={busy} onClick={() => void mutateRole(p.id, "grant")}>
                  {busy && <Loader2 className="me-1 size-3 animate-spin" />}
                  Beri peran
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void mutateRole(p.id, "revoke")}
                >
                  Cabut
                </Button>
              </div>
            );
          })}
          {(peopleQ.data ?? []).length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Tidak ada pengguna cocok.</p>
          )}
        </div>
      </Card>
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
