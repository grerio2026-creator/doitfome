import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminGate } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setEnterpriseBadge } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/format";
import { fetchEnterpriseProfiles } from "@/lib/queries";

export const Route = createFileRoute("/admin/affiliates")({
  head: () => ({
    meta: [
      { title: "Afiliasi & Verifikasi Badge — Konsol Admin DoIt4Me" },
      {
        name: "description",
        content:
          "Tinjau dokumen legal mitra institusi lalu setujui atau tolak badge resmi Pemda, BUMN, dan CSR.",
      },
      { property: "og:title", content: "Afiliasi & Verifikasi Badge — Konsol Admin DoIt4Me" },
      {
        property: "og:description",
        content: "Verifikasi NIB dan surat resmi sebelum badge institusi diberikan.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminGate role="admin_affiliate">
      <AffiliatesPage />
    </AdminGate>
  ),
});

const KINDS = ["enterprise", "pemda", "bumn", "csr"] as const;

function AffiliatesPage() {
  const queryClient = useQueryClient();
  const setBadge = useServerFn(setEnterpriseBadge);
  const [busy, setBusy] = useState<string | null>(null);
  const [kinds, setKinds] = useState<Record<string, (typeof KINDS)[number]>>({});

  const partnersQ = useQuery({ queryKey: ["admin", "partners"], queryFn: fetchEnterpriseProfiles });

  async function decide(id: string, badge_status: "verified" | "rejected") {
    setBusy(id);
    try {
      const kind = kinds[id];
      await setBadge({
        data:
          badge_status === "verified" && kind
            ? { id, badge_status, badge_kind: kind }
            : { id, badge_status },
      });
      toast.success(badge_status === "verified" ? "Badge resmi diberikan" : "Pengajuan ditolak");
      await queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi gagal");
    } finally {
      setBusy(null);
    }
  }

  const partners = partnersQ.data ?? [];
  const pending = partners.filter((p) => p.badge_status === "pending");
  const decided = partners.filter((p) => p.badge_status !== "pending");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold">Menunggu verifikasi ({pending.length})</h2>
        <div className="mt-3 space-y-3">
          {pending.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.legal_name}</span>
                <Badge variant="secondary">{p.badge_kind}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(p.created_at)}
                </span>
              </div>
              <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                <div>PIC: {p.pic_name ?? "-"}</div>
                <div>Kontak: {p.pic_contact ?? "-"}</div>
                <div>Kantor: {p.hq_address ?? "-"}</div>
                <div>
                  Dokumen:{" "}
                  {p.legal_doc_url ? (
                    <a
                      className="text-primary underline"
                      href={p.legal_doc_url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Lihat NIB / surat resmi
                    </a>
                  ) : (
                    "belum diunggah"
                  )}
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={kinds[p.id] ?? (p.badge_kind as (typeof KINDS)[number])}
                  onValueChange={(v) =>
                    setKinds((prev) => ({ ...prev, [p.id]: v as (typeof KINDS)[number] }))
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Jenis badge" />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={busy === p.id} onClick={() => void decide(p.id, "verified")}>
                  Setujui & beri badge resmi
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === p.id}
                  onClick={() => void decide(p.id, "rejected")}
                >
                  Tolak
                </Button>
              </div>
            </Card>
          ))}
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada pengajuan baru.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Riwayat keputusan</h2>
        <div className="mt-3 divide-y text-sm">
          {decided.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate font-medium">{p.legal_name}</span>
              <Badge variant={p.badge_status === "verified" ? "default" : "destructive"}>
                {p.badge_status}
              </Badge>
              <Link
                to="/enterprise/$ownerId"
                params={{ ownerId: p.owner_id }}
                className="text-primary underline"
              >
                Lihat profil publik
              </Link>
            </div>
          ))}
          {decided.length === 0 && (
            <p className="py-2 text-muted-foreground">Belum ada keputusan.</p>
          )}
        </div>
      </section>
    </div>
  );
}
