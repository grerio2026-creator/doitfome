import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { depositEnterpriseBudget, setWithdrawalStatus } from "@/lib/admin.functions";
import { formatDateTime, rupiah } from "@/lib/format";
import { fetchEnterpriseProfiles } from "@/lib/queries";
import type { Escrow, Withdrawal } from "@/lib/queries";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({
    meta: [
      { title: "Keuangan & Escrow — Konsol Admin DoIt4Me" },
      {
        name: "description",
        content:
          "Antrean persetujuan penarikan pekerja, monitor escrow dan komisi, serta deposit anggaran institusi.",
      },
      { property: "og:title", content: "Keuangan & Escrow — Konsol Admin DoIt4Me" },
      {
        property: "og:description",
        content: "Pantau GMV, komisi platform, dan setujui pencairan dana pekerja.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminGate role="admin_finance">
      <FinancePage />
    </AdminGate>
  ),
});

function FinancePage() {
  const queryClient = useQueryClient();
  const setStatus = useServerFn(setWithdrawalStatus);
  const deposit = useServerFn(depositEnterpriseBudget);
  const [busy, setBusy] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");

  const withdrawalsQ = useQuery({
    queryKey: ["admin", "withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const escrowQ = useQuery({
    queryKey: ["admin", "escrow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions_escrow")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Escrow[];
    },
  });

  const partnersQ = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: fetchEnterpriseProfiles,
  });

  const escrow = escrowQ.data ?? [];
  const gmv = escrow.reduce((sum, e) => sum + Number(e.amount), 0);
  const commission = escrow.reduce((sum, e) => sum + Number(e.commission), 0);
  const held = escrow
    .filter((e) => e.status === "HELD" || e.status === "DISPUTED")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  async function decide(id: string, status: "paid" | "rejected") {
    setBusy(id);
    try {
      await setStatus({ data: { id, status } });
      toast.success(status === "paid" ? "Penarikan disetujui" : "Penarikan ditolak");
      await queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi gagal");
    } finally {
      setBusy(null);
    }
  }

  async function submitDeposit() {
    const value = Number(amount);
    if (!partnerId || !Number.isFinite(value) || value <= 0) {
      toast.error("Pilih mitra dan isi nominal yang valid.");
      return;
    }
    setBusy("deposit");
    try {
      await deposit({ data: { id: partnerId, amount: Math.round(value) } });
      toast.success("Anggaran institusi ditambahkan");
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deposit gagal");
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["id", "job_id", "client_id", "worker_id", "amount", "commission", "status", "created_at"],
      ...escrow.map((e) => [
        e.id,
        e.job_id,
        e.client_id,
        e.worker_id,
        String(e.amount),
        String(e.commission),
        e.status,
        e.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "doit4me-escrow.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">GMV escrow</p>
          <p className="mt-1 text-lg font-bold">{rupiah(gmv)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Komisi platform</p>
          <p className="mt-1 text-lg font-bold">{rupiah(commission)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Dana tertahan</p>
          <p className="mt-1 text-lg font-bold">{rupiah(held)}</p>
        </Card>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Antrean penarikan</h2>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            Ekspor CSV escrow
          </Button>
        </div>
        <div className="mt-3 divide-y">
          {(withdrawalsQ.data ?? []).map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-medium">{rupiah(Number(w.amount))}</span>
              <Badge variant="secondary">{w.method}</Badge>
              <span className="text-muted-foreground">{w.account_ref ?? "-"}</span>
              <span className="text-muted-foreground">{formatDateTime(w.created_at)}</span>
              <Badge>{w.status}</Badge>
              {w.status === "pending" && (
                <div className="ms-auto flex gap-2">
                  <Button size="sm" disabled={busy === w.id} onClick={() => void decide(w.id, "paid")}>
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === w.id}
                    onClick={() => void decide(w.id, "rejected")}
                  >
                    Tolak
                  </Button>
                </div>
              )}
            </div>
          ))}
          {(withdrawalsQ.data ?? []).length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Belum ada permintaan penarikan.</p>
          )}
        </div>
      </section>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Deposit anggaran institusi</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pilih mitra institusi" />
            </SelectTrigger>
            <SelectContent>
              {(partnersQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.legal_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Nominal (Rp)"
            className="max-w-40"
          />
          <Button disabled={busy === "deposit"} onClick={() => void submitDeposit()}>
            Tambah anggaran
          </Button>
        </div>
        <div className="mt-4 divide-y text-sm">
          {(partnersQ.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate font-medium">{p.legal_name}</span>
              <Badge variant="secondary">{p.badge_status}</Badge>
              <span className="text-muted-foreground">{rupiah(Number(p.total_budget))}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
