import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AdminGate } from "@/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  moderateComment,
  moderateReview,
  setReportStatus,
  settleEscrow,
} from "@/lib/admin.functions";
import { rupiah, timeAgo } from "@/lib/format";
import type { Escrow, Report, Review } from "@/lib/queries";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderasi & Sengketa — Konsol Admin DoIt4Me" },
      {
        name: "description",
        content:
          "Pusat sengketa escrow, antrean laporan pengguna, dan moderasi ulasan bermasalah.",
      },
      { property: "og:title", content: "Moderasi & Sengketa — Konsol Admin DoIt4Me" },
      {
        property: "og:description",
        content: "Tinjau bukti foto, riwayat, lalu lepaskan atau kembalikan dana.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminGate role="admin_moderator">
      <ModerationPage />
    </AdminGate>
  ),
});

type DisputeRow = Escrow & {
  job: { id: string; title: string; before_photo: string | null; after_photo: string | null } | null;
};

function ModerationPage() {
  const queryClient = useQueryClient();
  const settle = useServerFn(settleEscrow);
  const setReport = useServerFn(setReportStatus);
  const modComment = useServerFn(moderateComment);
  const modReview = useServerFn(moderateReview);
  const [busy, setBusy] = useState<string | null>(null);

  const disputesQ = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions_escrow")
        .select("*, job:jobs(id, title, before_photo, after_photo)")
        .eq("status", "DISPUTED")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DisputeRow[];
    },
  });

  const reportsQ = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const flaggedQ = useQuery({
    queryKey: ["admin", "flagged-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .or("flagged.eq.true,rating.eq.1")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  async function run(key: string, fn: () => Promise<unknown>, message: string, invalidate: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(message);
      await queryClient.invalidateQueries({ queryKey: ["admin", invalidate] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi gagal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold">Pusat sengketa escrow</h2>
        <div className="mt-3 space-y-3">
          {(disputesQ.data ?? []).map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.job?.title ?? "Pekerjaan"}</span>
                <Badge variant="destructive">Sengketa</Badge>
                <span className="text-sm text-muted-foreground">{rupiah(Number(d.amount))}</span>
              </div>
              {d.dispute_reason && (
                <p className="mt-2 text-sm text-muted-foreground">Alasan: {d.dispute_reason}</p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Evidence label="Foto sebelum" src={d.job?.before_photo ?? null} />
                <Evidence label="Foto sesudah" src={d.job?.after_photo ?? null} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy === d.id}
                  onClick={() =>
                    void run(
                      d.id,
                      () => settle({ data: { id: d.id, status: "RELEASED" } }),
                      "Dana dilepaskan ke pekerja",
                      "disputes",
                    )
                  }
                >
                  Lepaskan ke pekerja
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === d.id}
                  onClick={() =>
                    void run(
                      d.id,
                      () => settle({ data: { id: d.id, status: "REFUNDED" } }),
                      "Dana dikembalikan ke klien",
                      "disputes",
                    )
                  }
                >
                  Kembalikan ke klien
                </Button>
              </div>
            </Card>
          ))}
          {(disputesQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada sengketa aktif.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Antrean laporan</h2>
        <div className="mt-3 space-y-3">
          {(reportsQ.data ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{r.target_type}</Badge>
                <span className="font-medium">{r.reason}</span>
                <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
              {r.target_preview && (
                <p className="mt-2 rounded-lg bg-muted p-2 text-sm">{r.target_preview}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() =>
                    void run(
                      r.id,
                      () => setReport({ data: { id: r.id, status: "kept" } }),
                      "Konten dipertahankan",
                      "reports",
                    )
                  }
                >
                  Pertahankan
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === r.id}
                  onClick={() =>
                    void run(
                      r.id,
                      async () => {
                        if (r.target_type === "comment")
                          await modComment({ data: { id: r.target_id, hidden: true } });
                        if (r.target_type === "review")
                          await modReview({ data: { id: r.target_id, flagged: true } });
                        await setReport({ data: { id: r.id, status: "deleted" } });
                      },
                      "Konten dihapus dari publik",
                      "reports",
                    )
                  }
                >
                  Hapus konten
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() =>
                    void run(
                      r.id,
                      () => setReport({ data: { id: r.id, status: "warned" } }),
                      "Peringatan dikirim",
                      "reports",
                    )
                  }
                >
                  Beri peringatan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() =>
                    void run(
                      r.id,
                      () => setReport({ data: { id: r.id, status: "suspended" } }),
                      "Pengguna ditandai suspensi",
                      "reports",
                    )
                  }
                >
                  Suspensi
                </Button>
              </div>
            </Card>
          ))}
          {(reportsQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Antrean laporan kosong.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Ulasan perlu ditinjau</h2>
        <div className="mt-3 space-y-3">
          {(flaggedQ.data ?? []).map((rev) => (
            <Card key={rev.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{rev.reviewer_name}</span>
                <Badge variant="secondary">{rev.rating}★</Badge>
                {rev.flagged && <Badge variant="destructive">Disembunyikan</Badge>}
              </div>
              {rev.comment && <p className="mt-2 text-muted-foreground">{rev.comment}</p>}
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={busy === rev.id}
                onClick={() =>
                  void run(
                    rev.id,
                    () => modReview({ data: { id: rev.id, flagged: !rev.flagged } }),
                    rev.flagged ? "Ulasan ditampilkan kembali" : "Ulasan disembunyikan",
                    "flagged-reviews",
                  )
                }
              >
                {rev.flagged ? "Tampilkan kembali" : "Sembunyikan"}
              </Button>
            </Card>
          ))}
          {(flaggedQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada ulasan bermasalah.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Evidence({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {src ? (
        <img
          src={src}
          alt={label}
          loading="lazy"
          className="mt-1 h-40 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="mt-1 flex h-40 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
          Belum ada bukti
        </div>
      )}
    </div>
  );
}
