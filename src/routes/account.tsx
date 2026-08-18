import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Loader2, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { rupiah, timeAgo } from "@/lib/format";
import { fetchPortfolios, type Withdrawal } from "@/lib/queries";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Profil, Verifikasi & Dompet — DoIt4Me" },
      {
        name: "description",
        content:
          "Kelola profil, verifikasi WhatsApp, portofolio terlindungi, dan pencairan saldo Anda.",
      },
      { property: "og:title", content: "Profil, Verifikasi & Dompet — DoIt4Me" },
      {
        property: "og:description",
        content: "Perbarui data diri, unggah portofolio, dan ajukan penarikan dana.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, refreshProfile, openLogin } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    domisili: profile?.domisili ?? "",
  });

  const portfolioQ = useQuery({
    queryKey: ["portfolios", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchPortfolios(user!.id),
  });

  const withdrawalsQ = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("worker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const [portfolio, setPortfolio] = useState({ title: "", kind: "photo", media_url: "" });
  const [withdraw, setWithdraw] = useState({ amount: 250000, method: "bank", account_ref: "" });

  const enterpriseQ = useQuery({
    queryKey: ["enterprise-profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_profiles")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const ent = enterpriseQ.data;
  const [entForm, setEntForm] = useState({
    legal_name: "",
    badge_kind: "enterprise",
    mission: "",
    website: "",
    hq_address: "",
    pic_name: "",
    pic_contact: "",
    logo_url: "",
    legal_doc_url: "",
  });
  const [entLoaded, setEntLoaded] = useState(false);
  if (ent && !entLoaded) {
    setEntLoaded(true);
    setEntForm({
      legal_name: ent.legal_name ?? "",
      badge_kind: ent.badge_kind ?? "enterprise",
      mission: ent.mission ?? "",
      website: ent.website ?? "",
      hq_address: ent.hq_address ?? "",
      pic_name: ent.pic_name ?? "",
      pic_contact: ent.pic_contact ?? "",
      logo_url: ent.logo_url ?? "",
      legal_doc_url: ent.legal_doc_url ?? "",
    });
  }

  async function saveEnterprise() {
    if (!entForm.legal_name.trim()) {
      toast.error("Nama legal wajib diisi");
      return;
    }
    const payload = {
      legal_name: entForm.legal_name.trim(),
      badge_kind: entForm.badge_kind,
      mission: entForm.mission.trim() || null,
      website: entForm.website.trim() || null,
      hq_address: entForm.hq_address.trim() || null,
      pic_name: entForm.pic_name.trim() || null,
      pic_contact: entForm.pic_contact.trim() || null,
      logo_url: entForm.logo_url.trim() || null,
      legal_doc_url: entForm.legal_doc_url.trim() || null,
    };
    const { error } = ent
      ? await supabase.from("enterprise_profiles").update(payload).eq("id", ent.id)
      : await supabase
          .from("enterprise_profiles")
          .insert({ ...payload, owner_id: user!.id, badge_status: "pending" });
    if (error) toast.error("Gagal menyimpan", { description: error.message });
    else {
      toast.success(ent ? "Profil institusi diperbarui" : "Pengajuan badge dikirim ke tim afiliasi");
      void queryClient.invalidateQueries({ queryKey: ["enterprise-profile", user!.id] });
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Akun</h1>
        <p className="mt-2 text-sm text-muted-foreground">Masuk untuk mengelola profil Anda.</p>
        <Button className="mt-4" onClick={() => openLogin()}>
          Masuk
        </Button>
      </div>
    );
  }

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        domisili: form.domisili.trim() || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error("Gagal menyimpan", { description: error.message });
    else {
      toast.success("Profil diperbarui");
      await refreshProfile();
    }
  }

  async function verifyWhatsApp() {
    const { error } = await supabase
      .from("profiles")
      .update({ whatsapp_verified: true })
      .eq("id", user!.id);
    if (error) toast.error("Verifikasi gagal", { description: error.message });
    else {
      toast.success("WhatsApp terverifikasi (simulasi)");
      await refreshProfile();
    }
  }

  async function addPortfolio() {
    if (!portfolio.title.trim()) return;
    const { error } = await supabase.from("portfolios").insert({
      worker_id: user!.id,
      title: portfolio.title.trim(),
      kind: portfolio.kind,
      media_url: portfolio.media_url.trim() || null,
    });
    if (error) toast.error("Gagal menambah portofolio", { description: error.message });
    else {
      setPortfolio({ title: "", kind: "photo", media_url: "" });
      toast.success("Portofolio ditambahkan");
      void queryClient.invalidateQueries({ queryKey: ["portfolios", user!.id] });
    }
  }

  async function requestWithdrawal() {
    const { error } = await supabase.from("withdrawals").insert({
      worker_id: user!.id,
      amount: withdraw.amount,
      method: withdraw.method,
      account_ref: withdraw.account_ref.trim() || null,
      status: "pending",
    });
    if (error) toast.error("Gagal mengajukan penarikan", { description: error.message });
    else {
      toast.success("Permintaan penarikan dikirim");
      void queryClient.invalidateQueries({ queryKey: ["withdrawals", user!.id] });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Akun & Verifikasi</h1>
      <p className="text-sm text-muted-foreground">
        {profile?.kind === "worker" ? "Akun pekerja" : "Akun pemberi kerja"}
      </p>

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="portfolio">Portofolio</TabsTrigger>
          <TabsTrigger value="wallet">Dompet</TabsTrigger>
          <TabsTrigger value="enterprise">Institusi</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="flex-row flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold">Pekerjaan Saya</p>
              <p className="text-sm text-muted-foreground">
                {activeWorkQ.data ?? 0} pekerjaan aktif sedang Anda kerjakan
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/my-jobs">Buka Pekerjaan Saya</Link>
            </Button>
          </Card>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={profile?.ktp_verified ? "default" : "secondary"}>
                <BadgeCheck className="me-1 size-3" />
                KTP {profile?.ktp_verified ? "terverifikasi" : "belum"}
              </Badge>
              <Badge variant={profile?.whatsapp_verified ? "default" : "secondary"}>
                WhatsApp {profile?.whatsapp_verified ? "terverifikasi" : "belum"}
              </Badge>
              {!profile?.whatsapp_verified && (
                <Button size="sm" variant="outline" onClick={() => void verifyWhatsApp()}>
                  Verifikasi WhatsApp
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama lengkap</Label>
              <Input
                id="name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domisili">Domisili</Label>
              <Input
                id="domisili"
                value={form.domisili}
                onChange={(e) => setForm({ ...form, domisili: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <Button disabled={saving} onClick={() => void saveProfile()}>
              {saving && <Loader2 className="me-2 size-4 animate-spin" />}
              Simpan perubahan
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <Card className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Judul karya"
                value={portfolio.title}
                onChange={(e) => setPortfolio({ ...portfolio, title: e.target.value })}
              />
              <Input
                placeholder="Jenis (photo/video/cert)"
                value={portfolio.kind}
                onChange={(e) => setPortfolio({ ...portfolio, kind: e.target.value })}
              />
              <Input
                placeholder="URL media"
                value={portfolio.media_url}
                onChange={(e) => setPortfolio({ ...portfolio, media_url: e.target.value })}
              />
            </div>
            <Button size="sm" onClick={() => void addPortfolio()}>
              <Plus className="me-2 size-4" />
              Tambah portofolio
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              {(portfolioQ.data ?? []).map((p) => (
                <div key={p.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.kind}</p>
                  {p.media_url && (
                    <img
                      src={p.media_url}
                      alt={p.title}
                      loading="lazy"
                      className="protected-media mt-2 h-32 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              ))}
              {(portfolioQ.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada portofolio.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" />
              Ajukan pencairan saldo hasil pekerjaan yang telah dilepas dari escrow.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                type="number"
                min={50000}
                step={50000}
                value={withdraw.amount}
                onChange={(e) => setWithdraw({ ...withdraw, amount: Number(e.target.value) })}
              />
              <Input
                placeholder="Metode (bank/ewallet)"
                value={withdraw.method}
                onChange={(e) => setWithdraw({ ...withdraw, method: e.target.value })}
              />
              <Input
                placeholder="Nomor rekening / e-wallet"
                value={withdraw.account_ref}
                onChange={(e) => setWithdraw({ ...withdraw, account_ref: e.target.value })}
              />
            </div>
            <Button onClick={() => void requestWithdrawal()}>Ajukan penarikan</Button>
            <div className="divide-y">
              {(withdrawalsQ.data ?? []).map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{rupiah(w.amount)}</span>
                  <span className="text-muted-foreground">{w.method}</span>
                  <Badge variant={w.status === "paid" ? "default" : "secondary"}>{w.status}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(w.created_at)}</span>
                </div>
              ))}
              {(withdrawalsQ.data ?? []).length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">Belum ada penarikan.</p>
              )}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="enterprise">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ent?.badge_status === "verified" ? "default" : "secondary"}>
                Badge: {ent?.badge_status ?? "belum diajukan"}
              </Badge>
              {ent?.badge_status === "verified" && (
                <Button asChild size="sm" variant="outline">
                  <a href={`/enterprise/${user.id}`}>Lihat halaman publik</a>
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Ajukan verifikasi sebagai Pemda, BUMN, program CSR, atau perusahaan. Tim afiliasi
              meninjau dokumen legal Anda sebelum badge resmi aktif.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Nama legal institusi</Label>
                <Input
                  id="legal_name"
                  value={entForm.legal_name}
                  onChange={(e) => setEntForm({ ...entForm, legal_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_kind">Jenis (enterprise/pemda/bumn/csr)</Label>
                <Input
                  id="badge_kind"
                  value={entForm.badge_kind}
                  onChange={(e) => setEntForm({ ...entForm, badge_kind: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pic_name">Nama PIC</Label>
                <Input
                  id="pic_name"
                  value={entForm.pic_name}
                  onChange={(e) => setEntForm({ ...entForm, pic_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pic_contact">Kontak PIC</Label>
                <Input
                  id="pic_contact"
                  value={entForm.pic_contact}
                  onChange={(e) => setEntForm({ ...entForm, pic_contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Situs web</Label>
                <Input
                  id="website"
                  value={entForm.website}
                  onChange={(e) => setEntForm({ ...entForm, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL logo</Label>
                <Input
                  id="logo_url"
                  value={entForm.logo_url}
                  onChange={(e) => setEntForm({ ...entForm, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hq_address">Alamat kantor</Label>
                <Input
                  id="hq_address"
                  value={entForm.hq_address}
                  onChange={(e) => setEntForm({ ...entForm, hq_address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_doc_url">Dokumen legal (NIB/surat resmi)</Label>
                <Input
                  id="legal_doc_url"
                  value={entForm.legal_doc_url}
                  onChange={(e) => setEntForm({ ...entForm, legal_doc_url: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mission">Misi / program</Label>
              <Textarea
                id="mission"
                rows={3}
                value={entForm.mission}
                onChange={(e) => setEntForm({ ...entForm, mission: e.target.value })}
              />
            </div>
            <Button onClick={() => void saveEnterprise()}>
              {ent ? "Simpan profil institusi" : "Ajukan verifikasi badge"}
            </Button>
            {ent ? (
              <p className="text-xs text-muted-foreground">
                Dampak: {ent.workers_absorbed} pekerja terserap • {ent.total_projects} proyek •{" "}
                {rupiah(Number(ent.total_budget))} anggaran
              </p>
            ) : null}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
