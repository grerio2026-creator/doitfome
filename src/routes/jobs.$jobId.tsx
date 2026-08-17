import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ImageIcon,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OfficialBadge, StarRating, VerifiedBadge } from "@/components/Badges";
import { ReportButton } from "@/components/ReportButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime, maskSensitive, rupiah, timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { fetchComments, fetchJob, fetchProfilesByIds } from "@/lib/queries";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Detail Pekerjaan — DoIt4Me" },
      {
        name: "description",
        content:
          "Lihat detail pekerjaan, struktur pembayaran, penawaran pekerja, dan status escrow di DoIt4Me.",
      },
      { property: "og:title", content: "Detail Pekerjaan — DoIt4Me" },
      {
        property: "og:description",
        content: "Ajukan penawaran atau kunci pekerja dengan pembayaran escrow aman.",
      },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const { t } = useI18n();
  const { user, profile, requireAuth } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [bid, setBid] = useState("");
  const [note, setNote] = useState("");
  const [lockTarget, setLockTarget] = useState<{ id: string; name: string; amount: number } | null>(
    null,
  );
  const [beforePhoto, setBeforePhoto] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");

  const jobQ = useQuery({ queryKey: ["job", jobId], queryFn: () => fetchJob(jobId) });
  const commentsQ = useQuery({
    queryKey: ["comments", jobId],
    queryFn: () => fetchComments(jobId),
  });
  const privateQ = useQuery({
    queryKey: ["job-private", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_private_details")
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(user),
  });
  const escrowQ = useQuery({
    queryKey: ["escrow", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions_escrow")
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(user),
  });

  const job = jobQ.data;
  const isOwner = Boolean(user && job && job.client_id === user.id);
  const isLockedWorker = Boolean(user && job && job.locked_worker_id === user.id);

  const bidMutation = useMutation({
    mutationFn: async () => {
      if (!user || !job) throw new Error("unauthenticated");
      const { error } = await supabase.from("comments").insert({
        job_id: job.id,
        user_id: user.id,
        body: maskSensitive(note || "Saya siap mengerjakan pekerjaan ini."),
        bid_amount: bid ? Number(bid) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBid("");
      setNote("");
      toast.success("Penawaran terkirim.");
      void qc.invalidateQueries({ queryKey: ["comments", jobId] });
    },
    onError: () => toast.error("Gagal mengirim penawaran."),
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!job || !lockTarget || !user) throw new Error("invalid");
      const amount = lockTarget.amount || job.payment_amount;
      const { error } = await supabase
        .from("jobs")
        .update({ locked_worker_id: lockTarget.id, status: "IN_PROGRESS" })
        .eq("id", job.id);
      if (error) throw error;
      const { error: e2 } = await supabase.from("transactions_escrow").insert({
        job_id: job.id,
        client_id: user.id,
        worker_id: lockTarget.id,
        amount,
        commission: Math.round(amount * 0.05),
        status: "HELD",
      });
      if (e2) throw e2;
      await supabase.from("conversations").insert({
        job_id: job.id,
        client_id: user.id,
        worker_id: lockTarget.id,
        kind: "active",
      });
    },
    onSuccess: () => {
      setLockTarget(null);
      toast.success("Pekerja dikunci. Dana ditahan di escrow.");
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
      void qc.invalidateQueries({ queryKey: ["escrow", jobId] });
    },
    onError: () => toast.error("Gagal mengunci pekerja."),
  });

  const submitWork = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "SUBMITTED",
          before_photo: beforePhoto || null,
          after_photo: afterPhoto || null,
        })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hasil kerja dikirim. Menunggu konfirmasi klien.");
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: () => toast.error("Gagal mengirim hasil kerja."),
  });

  const completeJob = useMutation({
    mutationFn: async () => {
      if (!job || !user) throw new Error("invalid");
      const { error } = await supabase.from("jobs").update({ status: "COMPLETED" }).eq("id", job.id);
      if (error) throw error;
      if (escrowQ.data) {
        await supabase
          .from("transactions_escrow")
          .update({ status: "RELEASED" })
          .eq("id", escrowQ.data.id);
      }
      if (job.locked_worker_id) {
        await supabase.from("reviews").insert({
          job_id: job.id,
          worker_id: job.locked_worker_id,
          reviewer_id: user.id,
          reviewer_name: profile?.full_name ?? "Klien",
          rating: Number(rating),
          comment: reviewText ? maskSensitive(reviewText) : null,
        });
      }
    },
    onSuccess: () => {
      toast.success("Pekerjaan selesai. Dana dilepas ke pekerja.");
      void qc.invalidateQueries({ queryKey: ["job", jobId] });
      void qc.invalidateQueries({ queryKey: ["escrow", jobId] });
    },
    onError: () => toast.error("Gagal menyelesaikan pekerjaan."),
  });

  if (jobQ.isLoading) {
    return <p className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (!job) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Pekerjaan tidak ditemukan.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/jobs">{t("feed_title")}</Link>
        </Button>
      </div>
    );
  }

  const bids = (commentsQ.data ?? []).filter((c) => c.bid_amount != null);
  const discussion = (commentsQ.data ?? []).filter((c) => c.bid_amount == null);
  const canSeePrivate = isOwner || isLockedWorker;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {job.is_institutional ? <OfficialBadge kind={job.institution_kind} /> : null}
          {job.timing_mode === "urgent" ? (
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">
              {t("urgent")}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {job.timing_mode === "scheduled" ? t("scheduled") : t("flexible")}
            </Badge>
          )}
          <Badge variant="outline">
            {job.location_mode === "remote" ? t("remote") : t("onsite")}
          </Badge>
          <Badge variant="secondary">{job.status}</Badge>
        </div>

        <div>
          <h1 className="text-2xl font-bold leading-snug">{job.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Diposting {timeAgo(job.created_at)}
            {job.expires_at ? ` • Deadline ${formatDateTime(job.expires_at)}` : ""}
          </p>
        </div>

        <Card className="gap-2 p-5">
          <h2 className="font-semibold">{t("job_desc")}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          {job.requirements ? (
            <>
              <Separator className="my-2" />
              <h3 className="font-semibold">{t("detail_requirements")}</h3>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {job.requirements}
              </p>
            </>
          ) : null}
          {job.photos.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {job.photos.map((p) => (
                <img key={p} src={p} alt="" className="size-24 rounded-lg object-cover" />
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="gap-2 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-primary" />
            {t("detail_location")}
          </h2>
          <p className="text-sm">
            {job.location_mode === "remote" ? t("remote") : (job.area_label ?? "-")}
          </p>
          {canSeePrivate && privateQ.data ? (
            <div className="rounded-lg bg-accent/60 p-3 text-sm">
              <p className="font-medium">{privateQ.data.exact_address ?? "-"}</p>
              <p className="text-muted-foreground">{privateQ.data.contact_phone ?? "-"}</p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              🔒 {t("exact_hidden")}
            </p>
          )}
          {job.headcount > 1 ? (
            <p className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              <Users className="size-4" /> {t("needed_workers", { n: job.headcount })}
            </p>
          ) : null}
        </Card>

        {isOwner ? (
          <Card className="gap-3 p-5">
            <h2 className="font-semibold">
              {t("bids")} ({bids.length})
            </h2>
            {bids.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              bids.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={b.author?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{(b.author?.full_name ?? "P").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-semibold">{b.author?.full_name ?? "Pekerja"}</p>
                    <p className="text-xs text-muted-foreground">{b.body}</p>
                    {b.author ? (
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating value={b.author.rating} count={b.author.jobs_completed} />
                        {b.author.ktp_verified ? <VerifiedBadge /> : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="font-bold text-action">{rupiah(b.bid_amount)}</p>
                  {job.status === "OPEN" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setLockTarget({
                          id: b.user_id,
                          name: b.author?.full_name ?? "Pekerja",
                          amount: b.bid_amount ?? job.payment_amount,
                        })
                      }
                    >
                      <Lock className="size-4" /> {t("lock_worker")}
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </Card>
        ) : null}

        {isLockedWorker && (job.status === "IN_PROGRESS" || job.status === "SUBMITTED") ? (
          <Card className="gap-3 p-5">
            <h2 className="font-semibold">{t("submit_work")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="before">{t("upload_before")}</Label>
                <Input
                  id="before"
                  value={beforePhoto}
                  onChange={(e) => setBeforePhoto(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label htmlFor="after">{t("upload_after")}</Label>
                <Input
                  id="after"
                  value={afterPhoto}
                  onChange={(e) => setAfterPhoto(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <Button
              className="self-start bg-action text-action-foreground hover:bg-action/90"
              onClick={() => submitWork.mutate()}
              disabled={submitWork.isPending}
            >
              <ImageIcon className="size-4" /> {t("submit_work")}
            </Button>
          </Card>
        ) : null}

        {isOwner && job.status === "SUBMITTED" ? (
          <Card className="gap-3 p-5">
            <h2 className="font-semibold">{t("rate_title")}</h2>
            <p className="text-xs text-muted-foreground">{t("rate_note")}</p>
            <div className="flex flex-wrap gap-3">
              {job.before_photo ? (
                <img src={job.before_photo} alt="" className="size-28 rounded-lg object-cover" />
              ) : null}
              {job.after_photo ? (
                <img src={job.after_photo} alt="" className="size-28 rounded-lg object-cover" />
              ) : null}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-20"
              />
              <Input
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Ulasan Anda…"
              />
            </div>
            <Button
              className="self-start bg-action text-action-foreground hover:bg-action/90"
              onClick={() => completeJob.mutate()}
              disabled={completeJob.isPending}
            >
              <CheckCircle2 className="size-4" /> {t("confirm_done")}
            </Button>
          </Card>
        ) : null}

        <Card className="gap-3 p-5">
          <h2 className="font-semibold">Diskusi Publik</h2>
          {discussion.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            discussion.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{c.author?.full_name ?? "Pengguna"}</p>
                  <ReportButton targetType="comment" targetId={c.id} preview={c.body} />
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">🔒 {t("masked_note")}</p>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="gap-2 p-5">
          <p className="text-xs text-muted-foreground">{t("detail_payment")}</p>
          <p className="text-2xl font-extrabold text-action">{rupiah(job.payment_amount)}</p>
          <p className="text-sm text-muted-foreground">
            {t(`payment_${job.payment_type}` as "payment_harian")}
          </p>
          <Separator className="my-2" />
          <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">{t("escrow_title")}</p>
              <p className="text-xs text-muted-foreground">{t("escrow_note")}</p>
              {escrowQ.data ? (
                <Badge variant="secondary" className="mt-2">
                  Escrow: {escrowQ.data.status}
                </Badge>
              ) : null}
            </div>
          </div>

          {!isOwner && job.status === "OPEN" ? (
            <div className="mt-3 space-y-2">
              <Label htmlFor="bidAmount">{t("amount")}</Label>
              <Input
                id="bidAmount"
                type="number"
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                placeholder={String(job.payment_amount)}
              />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ceritakan pengalaman Anda…"
                rows={3}
              />
              <Button
                className="w-full"
                disabled={bidMutation.isPending}
                onClick={() =>
                  requireAuth(() => {
                    if (profile && !profile.whatsapp_verified) {
                      toast.error(t("wa_required"));
                      void navigate({ to: "/account" });
                      return;
                    }
                    bidMutation.mutate();
                  }, t("wa_required"))
                }
              >
                {t("apply")}
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="gap-2 p-5">
          <p className="text-xs text-muted-foreground">Pemberi Kerja</p>
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={job.client?.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{(job.client?.full_name ?? "K").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{job.client?.full_name ?? "-"}</p>
              <p className="text-xs text-muted-foreground">{job.client?.domisili ?? "-"}</p>
            </div>
          </div>
          {job.client?.ktp_verified ? <VerifiedBadge /> : null}
          <Button asChild variant="outline" className="mt-2">
            <Link to="/inbox">
              <MessageSquare className="size-4" /> {t("nav_inbox")}
            </Link>
          </Button>
        </Card>
      </aside>

      <Dialog open={Boolean(lockTarget)} onOpenChange={(o) => !o && setLockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("escrow_title")}</DialogTitle>
            <DialogDescription>{t("escrow_note")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg bg-accent/60 p-4 text-sm">
            <p>
              Pekerja: <span className="font-semibold">{lockTarget?.name}</span>
            </p>
            <p>
              Nominal:{" "}
              <span className="font-semibold text-action">{rupiah(lockTarget?.amount ?? 0)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Komisi platform 5% • Dana dilepas setelah Anda konfirmasi selesai.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockTarget(null)}>
              {t("back")}
            </Button>
            <Button onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending}>
              <Lock className="size-4" /> {t("hold_funds")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { fetchProfilesByIds };
