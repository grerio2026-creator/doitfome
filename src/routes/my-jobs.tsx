import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, MessageSquare, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { JobProgress } from "@/components/JobProgress";
import { ReportButton } from "@/components/ReportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { maskSensitive, rupiah, timeAgo } from "@/lib/format";
import {
  fetchBidCounts,
  fetchEscrowsByJobIds,
  fetchJobsByClient,
  fetchJobsByWorker,
  fetchMyBids,
  fetchProfilesByIds,
  fetchReviewsByJobIds,
  type JobWithSkill,
} from "@/lib/queries";

export const Route = createFileRoute("/my-jobs")({
  head: () => ({
    meta: [
      { title: "Pekerjaan Saya — DoIt4Me" },
      {
        name: "description",
        content:
          "Pantau status dan progres pekerjaan yang Anda posting maupun yang Anda kerjakan, lalu selesaikan, bayar, dan beri ulasan.",
      },
      { property: "og:title", content: "Pekerjaan Saya — DoIt4Me" },
      {
        property: "og:description",
        content: "Status, progres, pembayaran escrow, dan ulasan dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyJobsPage,
});

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Menunggu pekerja",
  IN_PROGRESS: "Sedang dikerjakan",
  SUBMITTED: "Hasil dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  DISPUTED: "Sengketa",
};

function MyJobsPage() {
  const { user, profile, openLogin } = useAuth();
  const qc = useQueryClient();

  const postedQ = useQuery({
    queryKey: ["my-posted", user?.id],
    queryFn: () => fetchJobsByClient(user!.id),
    enabled: Boolean(user),
  });
  const workingQ = useQuery({
    queryKey: ["my-working", user?.id],
    queryFn: () => fetchJobsByWorker(user!.id),
    enabled: Boolean(user),
  });
  const bidsQ = useQuery({
    queryKey: ["my-bids", user?.id],
    queryFn: () => fetchMyBids(user!.id),
    enabled: Boolean(user),
  });

  const allJobIds = [
    ...(postedQ.data ?? []).map((j) => j.id),
    ...(workingQ.data ?? []).map((j) => j.id),
  ];
  const escrowQ = useQuery({
    queryKey: ["my-escrows", allJobIds.join(",")],
    queryFn: () => fetchEscrowsByJobIds(allJobIds),
    enabled: allJobIds.length > 0,
  });
  const bidCountQ = useQuery({
    queryKey: ["my-bid-counts", (postedQ.data ?? []).map((j) => j.id).join(",")],
    queryFn: () => fetchBidCounts((postedQ.data ?? []).map((j) => j.id)),
    enabled: (postedQ.data ?? []).length > 0,
  });
  const reviewQ = useQuery({
    queryKey: ["my-job-reviews", allJobIds.join(",")],
    queryFn: () => fetchReviewsByJobIds(allJobIds),
    enabled: allJobIds.length > 0,
  });
  const peopleIds = [
    ...(postedQ.data ?? []).map((j) => j.locked_worker_id),
    ...(workingQ.data ?? []).map((j) => j.client_id),
  ].filter((id): id is string => Boolean(id));
  const peopleQ = useQuery({
    queryKey: ["my-jobs-people", peopleIds.join(",")],
    queryFn: () => fetchProfilesByIds([...new Set(peopleIds)]),
    enabled: peopleIds.length > 0,
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["my-posted"] });
    void qc.invalidateQueries({ queryKey: ["my-working"] });
    void qc.invalidateQueries({ queryKey: ["my-escrows"] });
    void qc.invalidateQueries({ queryKey: ["my-job-reviews"] });
  }

  const completePay = useMutation({
    mutationFn: async (args: { job: JobWithSkill; rating: number; comment: string }) => {
      const { job, rating, comment } = args;
      const { error } = await supabase.from("jobs").update({ status: "COMPLETED" }).eq("id", job.id);
      if (error) throw error;
      const escrow = escrowQ.data?.[job.id];
      if (escrow) {
        await supabase
          .from("transactions_escrow")
          .update({ status: "RELEASED" })
          .eq("id", escrow.id);
      }
      if (job.locked_worker_id) {
        await supabase.from("reviews").insert({
          job_id: job.id,
          worker_id: job.locked_worker_id,
          reviewer_id: user!.id,
          reviewer_name: profile?.full_name ?? "Klien",
          rating,
          comment: comment ? maskSensitive(comment) : null,
        });
      }
    },
    onSuccess: () => {
      toast.success("Pekerjaan selesai. Dana dilepas ke pekerja.");
      refresh();
    },
    onError: () => toast.error("Gagal menyelesaikan pekerjaan."),
  });

  const submitWork = useMutation({
    mutationFn: async (args: { jobId: string; before: string; after: string }) => {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "SUBMITTED",
          before_photo: args.before || null,
          after_photo: args.after || null,
        })
        .eq("id", args.jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hasil kerja dikirim. Menunggu konfirmasi klien.");
      refresh();
    },
    onError: () => toast.error("Gagal mengirim hasil kerja."),
  });

  const dispute = useMutation({
    mutationFn: async (jobId: string) => {
      const escrow = escrowQ.data?.[jobId];
      const { error } = await supabase.from("jobs").update({ status: "DISPUTED" }).eq("id", jobId);
      if (error) throw error;
      if (escrow) {
        await supabase
          .from("transactions_escrow")
          .update({ status: "DISPUTED", dispute_reason: "Hasil kerja tidak sesuai" })
          .eq("id", escrow.id);
      }
    },
    onSuccess: () => {
      toast.success("Sengketa diajukan. Tim moderasi akan meninjau.");
      refresh();
    },
    onError: () => toast.error("Gagal mengajukan sengketa."),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Pekerjaan Saya</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masuk untuk melihat status dan progres pekerjaan Anda.
        </p>
        <Button className="mt-5" onClick={() => openLogin()}>
          Masuk
        </Button>
      </div>
    );
  }

  const posted = postedQ.data ?? [];
  const working = workingQ.data ?? [];
  const activeWork = working.filter((j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED");
  const pendingBids = (bidsQ.data ?? []).filter(
    (b) => b.job && b.job.status === "OPEN" && b.job.locked_worker_id !== user.id,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Pekerjaan Saya</h1>
        <p className="text-sm text-muted-foreground">
          Semua pekerjaan yang Anda posting dan kerjakan, beserta status dan aksinya.
        </p>
      </div>

      {activeWork.length > 0 ? (
        <Badge className="gap-1 bg-action text-action-foreground hover:bg-action">
          <BadgeCheck className="size-3.5" />
          Sedang menerima pekerjaan • {activeWork.length} aktif
        </Badge>
      ) : null}

      <Tabs defaultValue="posted">
        <TabsList>
          <TabsTrigger value="posted">Saya posting ({posted.length})</TabsTrigger>
          <TabsTrigger value="working">Saya kerjakan ({working.length})</TabsTrigger>
          <TabsTrigger value="bids">Penawaran saya ({pendingBids.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="space-y-4 pt-4">
          {posted.length === 0 ? (
            <EmptyState text="Belum ada pekerjaan yang Anda posting." cta />
          ) : (
            posted.map((job) => (
              <ClientJobCard
                key={job.id}
                job={job}
                workerName={
                  job.locked_worker_id
                    ? (peopleQ.data?.[job.locked_worker_id]?.full_name ?? "Pekerja")
                    : null
                }
                bidCount={bidCountQ.data?.[job.id] ?? 0}
                escrowStatus={escrowQ.data?.[job.id]?.status ?? null}
                givenRating={reviewQ.data?.[job.id]?.rating ?? null}
                onComplete={(rating, comment) => completePay.mutate({ job, rating, comment })}
                onDispute={() => dispute.mutate(job.id)}
                busy={completePay.isPending || dispute.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="working" className="space-y-4 pt-4">
          {working.length === 0 ? (
            <EmptyState text="Belum ada pekerjaan yang Anda kerjakan. Ajukan penawaran di feed pekerjaan." />
          ) : (
            working.map((job) => (
              <WorkerJobCard
                key={job.id}
                job={job}
                clientName={peopleQ.data?.[job.client_id]?.full_name ?? "Pemberi kerja"}
                escrowStatus={escrowQ.data?.[job.id]?.status ?? null}
                receivedRating={reviewQ.data?.[job.id]?.rating ?? null}
                onSubmit={(before, after) => submitWork.mutate({ jobId: job.id, before, after })}
                busy={submitWork.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="bids" className="space-y-3 pt-4">
          {pendingBids.length === 0 ? (
            <EmptyState text="Belum ada penawaran yang menunggu keputusan." />
          ) : (
            pendingBids.map((bid) => (
              <Card key={bid.id} className="gap-1 p-4">
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: bid.job!.id }}
                  className="font-semibold hover:text-primary"
                >
                  {bid.job!.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Penawaran Anda {rupiah(bid.bid_amount)} • {timeAgo(bid.created_at)}
                </p>
                <Badge variant="secondary" className="w-fit">
                  Menunggu keputusan pemberi kerja
                </Badge>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text, cta }: { text: string; cta?: boolean }) {
  return (
    <Card className="items-start gap-3 p-6">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant={cta ? "default" : "outline"} size="sm">
        <Link to={cta ? "/post-job" : "/jobs"}>{cta ? "Posting pekerjaan" : "Lihat pekerjaan"}</Link>
      </Button>
    </Card>
  );
}

function EscrowBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const label =
    status === "HELD"
      ? "Dana ditahan escrow"
      : status === "RELEASED"
        ? "Dana dilepas"
        : status === "REFUNDED"
          ? "Dana dikembalikan"
          : "Escrow disengketakan";
  return (
    <Badge variant="outline" className="w-fit">
      {label}
    </Badge>
  );
}

function ClientJobCard({
  job,
  workerName,
  bidCount,
  escrowStatus,
  givenRating,
  onComplete,
  onDispute,
  busy,
}: {
  job: JobWithSkill;
  workerName: string | null;
  bidCount: number;
  escrowStatus: string | null;
  givenRating: number | null;
  onComplete: (rating: number, comment: string) => void;
  onDispute: () => void;
  busy: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="font-semibold hover:text-primary"
          >
            {job.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {rupiah(job.payment_amount)} • {STATUS_LABEL[job.status] ?? job.status}
            {workerName ? ` • Pekerja: ${workerName}` : ""}
          </p>
        </div>
        <Badge variant="secondary">{job.status}</Badge>
      </div>

      <JobProgress status={job.status} />
      <EscrowBadge status={escrowStatus} />

      {job.status === "OPEN" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{bidCount} penawaran masuk</span>
          <Button asChild size="sm">
            <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
              Lihat penawaran
            </Link>
          </Button>
        </div>
      ) : null}

      {job.status === "IN_PROGRESS" ? (
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link to="/inbox">
            <MessageSquare className="size-4" /> Chat pekerja
          </Link>
        </Button>
      ) : null}

      {job.status === "SUBMITTED" ? (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {job.before_photo ? (
              <img src={job.before_photo} alt="Foto sebelum" className="size-24 rounded-lg object-cover" />
            ) : null}
            {job.after_photo ? (
              <img src={job.after_photo} alt="Foto sesudah" className="size-24 rounded-lg object-cover" />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Beri bintang</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} bintang`}
                  onClick={() => setRating(n)}
                  className="p-0.5"
                >
                  <Star
                    className={
                      n <= rating ? "size-6 fill-gold text-gold" : "size-6 text-muted-foreground"
                    }
                  />
                </button>
              ))}
            </div>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Testimoni untuk pekerja (opsional)"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              className="bg-action text-action-foreground hover:bg-action/90"
              onClick={() => onComplete(rating, comment)}
            >
              Selesai & Bayar
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={onDispute}>
              Ajukan sengketa
            </Button>
          </div>
        </>
      ) : null}

      {job.status === "COMPLETED" ? (
        <p className="text-sm text-muted-foreground">
          Selesai & dibayar{givenRating ? ` • Anda memberi ${givenRating} bintang` : ""}
        </p>
      ) : null}

      <div className="flex justify-end">
        <ReportButton targetType="job" targetId={job.id} preview={job.title} />
      </div>
    </Card>
  );
}

function WorkerJobCard({
  job,
  clientName,
  escrowStatus,
  receivedRating,
  onSubmit,
  busy,
}: {
  job: JobWithSkill;
  clientName: string;
  escrowStatus: string | null;
  receivedRating: number | null;
  onSubmit: (before: string, after: string) => void;
  busy: boolean;
}) {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");

  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="font-semibold hover:text-primary"
          >
            {job.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {rupiah(job.payment_amount)} • Pemberi kerja: {clientName}
          </p>
        </div>
        <Badge variant="secondary">{STATUS_LABEL[job.status] ?? job.status}</Badge>
      </div>

      <JobProgress status={job.status} />
      <EscrowBadge status={escrowStatus} />

      {job.status === "IN_PROGRESS" ? (
        <>
          <Separator />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`before-${job.id}`}>Tautan foto sebelum</Label>
              <Input
                id={`before-${job.id}`}
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`after-${job.id}`}>Tautan foto sesudah</Label>
              <Input
                id={`after-${job.id}`}
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={busy}
            className="w-fit bg-action text-action-foreground hover:bg-action/90"
            onClick={() => onSubmit(before, after)}
          >
            Selesai — kirim hasil kerja
          </Button>
        </>
      ) : null}

      {job.status === "SUBMITTED" ? (
        <p className="text-sm text-muted-foreground">Menunggu konfirmasi klien.</p>
      ) : null}

      {job.status === "COMPLETED" ? (
        <p className="text-sm text-muted-foreground">
          Selesai • dana dilepas{receivedRating ? ` • ${receivedRating} bintang diterima` : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/inbox">
            <MessageSquare className="size-4" /> Chat
          </Link>
        </Button>
        <ReportButton targetType="job" targetId={job.id} preview={job.title} />
      </div>
    </Card>
  );
}
