import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BadgeCheck, MapPin, MessageSquare, Send, ShieldAlert, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StarRating, VerifiedBadge } from "@/components/Badges";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { containsSensitive, maskSensitive, timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  fetchActiveWorkCount,
  fetchPortfolios,
  fetchReviews,
  fetchWorker,
} from "@/lib/queries";

export const Route = createFileRoute("/workers/$workerId")({
  head: () => ({
    meta: [
      { title: "Profil Pekerja & Portofolio — DoIt4Me" },
      {
        name: "description",
        content:
          "Lihat portofolio terlindungi, sertifikat, rating, dan ulasan pekerja, lalu tawarkan proyek langsung.",
      },
      { property: "og:title", content: "Profil Pekerja & Portofolio — DoIt4Me" },
      {
        property: "og:description",
        content: "Portofolio hanya bisa dilihat — unduhan dinonaktifkan untuk melindungi karya.",
      },
    ],
  }),
  component: WorkerProfile,
});

function ProtectedMedia({ url, kind }: { url: string | null; kind: string }) {
  const { t } = useI18n();
  return (
    <div
      className="protected-media relative overflow-hidden rounded-xl border border-border bg-muted"
      onContextMenu={(e) => e.preventDefault()}
    >
      {kind === "video" ? (
        <div className="grid aspect-video place-items-center bg-foreground/5">
          <Video className="size-8 text-muted-foreground" />
        </div>
      ) : (
        <img
          src={url ?? ""}
          alt=""
          draggable={false}
          className="pointer-events-none aspect-square w-full select-none object-cover"
        />
      )}
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-bold tracking-widest text-white/70 mix-blend-overlay">
        {t("watermark")}
      </span>
    </div>
  );
}

function WorkerProfile() {
  const { workerId } = Route.useParams();
  const { t } = useI18n();
  const { user, profile, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [offer, setOffer] = useState({ title: "", amount: "", detail: "" });

  const workerQ = useQuery({ queryKey: ["worker", workerId], queryFn: () => fetchWorker(workerId) });
  const reviewsQ = useQuery({
    queryKey: ["reviews", workerId],
    queryFn: () => fetchReviews(workerId),
  });
  const portfolioQ = useQuery({
    queryKey: ["portfolios", workerId],
    queryFn: () => fetchPortfolios(workerId),
  });
  const activeWorkQ = useQuery({
    queryKey: ["active-work", workerId],
    queryFn: () => fetchActiveWorkCount(workerId),
  });

  const startChat = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("unauthenticated");
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("worker_id", workerId)
        .eq("kind", "inquiry")
        .maybeSingle();
      let convoId = existing?.id;
      if (!convoId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ client_id: user.id, worker_id: workerId, kind: "inquiry" })
          .select("id")
          .single();
        if (error) throw error;
        convoId = data.id;
      }
      const { error: e2 } = await supabase
        .from("direct_messages")
        .insert({ conversation_id: convoId, sender_id: user.id, body: maskSensitive(message) });
      if (e2) throw e2;
    },
    onSuccess: () => {
      setChatOpen(false);
      setMessage("");
      toast.success("Pesan terkirim. Buka Pesan untuk melanjutkan diskusi.");
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Gagal mengirim pesan."),
  });

  const sendOffer = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("unauthenticated");
      const amount = Number(offer.amount || 0);
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          client_id: user.id,
          title: offer.title,
          description: offer.detail,
          payment_amount: amount,
          payment_type: "selesai_kerja",
          timing_mode: "flexible",
          location_mode: "remote",
          status: "OPEN",
          headcount: 1,
          area_label: profile?.domisili ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("conversations").insert({
        client_id: user.id,
        worker_id: workerId,
        kind: "inquiry",
        job_id: job.id,
      });
      await supabase.from("comments").insert({
        job_id: job.id,
        user_id: user.id,
        body: maskSensitive(`Penawaran langsung: ${offer.detail}`),
      });
    },
    onSuccess: () => {
      setOfferOpen(false);
      setOffer({ title: "", amount: "", detail: "" });
      toast.success("Penawaran proyek langsung terkirim ke pekerja.");
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Gagal mengirim penawaran."),
  });

  const worker = workerQ.data;
  if (workerQ.isLoading) {
    return <p className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (!worker) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Pekerja tidak ditemukan.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/workers">{t("workers_title")}</Link>
        </Button>
      </div>
    );
  }

  const photos = (portfolioQ.data ?? []).filter((p) => p.kind === "photo");
  const videos = (portfolioQ.data ?? []).filter((p) => p.kind === "video");
  const certs = (portfolioQ.data ?? []).filter((p) => p.kind === "certificate");

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card className="gap-3 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={worker.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{worker.full_name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{worker.full_name}</h1>
              <p className="text-sm text-muted-foreground">{worker.headline ?? "-"}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {worker.domisili ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={worker.rating} count={worker.jobs_completed} />
            {worker.ktp_verified ? <VerifiedBadge /> : null}
            <Badge variant="secondary">
              {worker.jobs_completed} {t("jobs_done")}
            </Badge>
            {(activeWorkQ.data ?? 0) > 0 ? (
              <Badge className="gap-1 bg-action text-action-foreground hover:bg-action">
                <BadgeCheck className="size-3.5" />
                Sedang menerima pekerjaan
              </Badge>
            ) : null}
          </div>
          {worker.bio ? <p className="text-sm text-muted-foreground">{worker.bio}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            {worker.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t("portfolio")}</h2>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldAlert className="size-3.5" /> {t("view_only")}
            </span>
          </div>
          <Tabs defaultValue="photos">
            <TabsList className="flex-wrap">
              <TabsTrigger value="photos">{t("tab_photos")}</TabsTrigger>
              <TabsTrigger value="videos">{t("tab_videos")}</TabsTrigger>
              <TabsTrigger value="certs">{t("tab_certs")}</TabsTrigger>
            </TabsList>
            <TabsContent value="photos" className="mt-3 grid gap-3 sm:grid-cols-3">
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                photos.map((p) => (
                  <div key={p.id}>
                    <ProtectedMedia url={p.media_url} kind="photo" />
                    <p className="mt-1 truncate text-xs text-muted-foreground">{p.title}</p>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="videos" className="mt-3 grid gap-3 sm:grid-cols-2">
              {videos.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                videos.map((p) => (
                  <div key={p.id}>
                    <ProtectedMedia url={p.media_url} kind="video" />
                    <p className="mt-1 truncate text-xs text-muted-foreground">{p.title}</p>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="certs" className="mt-3 space-y-2">
              {certs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                certs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Award className="size-5 text-gold" />
                    <div>
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.issuer ?? "-"}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="gap-3 p-5">
          <h2 className="font-semibold">
            {t("reviews")} ({reviewsQ.data?.length ?? 0})
          </h2>
          {(reviewsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            (reviewsQ.data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.reviewer_name}</p>
                  <StarRating value={r.rating} />
                </div>
                <p className="text-sm text-muted-foreground">{r.comment ?? "-"}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
                  <ReportButton targetType="review" targetId={r.id} preview={r.comment} />
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">{t("rate_note")}</p>
        </Card>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <Card className="gap-2 p-5">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => requireAuth(() => setChatOpen(true))}
          >
            <MessageSquare className="size-4" /> {t("chat_ask")}
          </Button>
          <Button
            className="w-full bg-action text-action-foreground hover:bg-action/90"
            onClick={() => requireAuth(() => setOfferOpen(true))}
          >
            <Send className="size-4" /> {t("direct_hire")}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">🔒 {t("masked_note")}</p>
        </Card>
      </aside>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat_ask")}</DialogTitle>
            <DialogDescription>{t("masked_note")}</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("type_message")}
          />
          {containsSensitive(message) ? (
            <p className="text-xs text-destructive">
              Nomor/e-mail terdeteksi dan akan otomatis disamarkan.
            </p>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => startChat.mutate()}
              disabled={!message.trim() || startChat.isPending}
            >
              {t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("direct_hire")}</DialogTitle>
            <DialogDescription>{t("escrow_note")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ot">{t("job_title")}</Label>
              <Input
                id="ot"
                value={offer.title}
                onChange={(e) => setOffer({ ...offer, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="oa">{t("amount")}</Label>
              <Input
                id="oa"
                type="number"
                value={offer.amount}
                onChange={(e) => setOffer({ ...offer, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="od">{t("job_desc")}</Label>
              <Textarea
                id="od"
                rows={3}
                value={offer.detail}
                onChange={(e) => setOffer({ ...offer, detail: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => sendOffer.mutate()}
              disabled={!offer.title.trim() || !offer.amount || sendOffer.isPending}
            >
              {t("send_offer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
