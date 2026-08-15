import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { fetchSkills } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/post-job")({
  head: () => ({
    meta: [
      { title: "Pasang Pekerjaan Baru — DoIt4Me" },
      {
        name: "description",
        content:
          "Buat pekerjaan hiperlokal dalam 4 langkah: detail, lokasi & waktu, pembayaran, lalu publikasi.",
      },
      { property: "og:title", content: "Pasang Pekerjaan Baru — DoIt4Me" },
      {
        property: "og:description",
        content: "Tentukan keahlian, lokasi, jadwal, dan dana escrow untuk pekerjaan Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostJobPage,
});

type LocationMode = "onsite" | "remote";
type TimingMode = "urgent" | "scheduled" | "flexible";
type PaymentType = "selesai_kerja" | "harian" | "borongan" | "mingguan";

function PostJobPage() {
  const { user, profile, openLogin } = useAuth();
  const navigate = useNavigate();
  const skillsQ = useQuery({ queryKey: ["skills"], queryFn: fetchSkills });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    skillId: "",
    locationMode: "onsite" as LocationMode,
    areaLabel: profile?.domisili ?? "",
    exactAddress: "",
    contactPhone: "",
    timingMode: "urgent" as TimingMode,
    paymentType: "borongan" as PaymentType,
    paymentAmount: 150000,
    headcount: 1,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canNext =
    step === 1
      ? form.title.trim().length > 4 && form.description.trim().length > 9
      : step === 2
        ? form.locationMode === "remote" || form.areaLabel.trim().length > 1
        : step === 3
          ? form.paymentAmount > 0 && form.headcount > 0
          : true;

  async function publish() {
    if (!user) {
      openLogin("Masuk untuk memasang pekerjaan.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim() || null,
        skill_id: form.skillId || null,
        location_mode: form.locationMode,
        area_label: form.locationMode === "remote" ? null : form.areaLabel.trim(),
        timing_mode: form.timingMode,
        payment_type: form.paymentType,
        payment_amount: form.paymentAmount,
        headcount: form.headcount,
        status: "OPEN",
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setSaving(false);
      toast.error("Gagal memasang pekerjaan", { description: error?.message });
      return;
    }

    if (form.locationMode === "onsite" && (form.exactAddress || form.contactPhone)) {
      await supabase.from("job_private_details").insert({
        job_id: data.id,
        exact_address: form.exactAddress.trim() || null,
        contact_phone: form.contactPhone.trim() || null,
      });
    }

    setSaving(false);
    toast.success("Pekerjaan dipublikasikan", {
      description: "Alamat lengkap hanya terlihat oleh pekerja yang Anda kunci.",
    });
    void navigate({ to: "/jobs/$jobId", params: { jobId: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Pasang Pekerjaan</h1>
      <p className="text-sm text-muted-foreground">Langkah {step} dari 4</p>
      <Progress value={step * 25} className="mt-4" />

      <Card className="mt-6 space-y-5 p-5">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Judul pekerjaan</Label>
              <Input
                id="title"
                value={form.title}
                placeholder="Contoh: Perbaiki keran bocor di dapur"
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Deskripsi</Label>
              <Textarea
                id="desc"
                rows={5}
                value={form.description}
                placeholder="Jelaskan pekerjaan, alat yang tersedia, dan hasil yang diharapkan."
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Keahlian yang dibutuhkan</Label>
              <Select value={form.skillId} onValueChange={(v) => set("skillId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keahlian" />
                </SelectTrigger>
                <SelectContent>
                  {(skillsQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="req">Persyaratan (opsional)</Label>
              <Textarea
                id="req"
                rows={3}
                value={form.requirements}
                onChange={(e) => set("requirements", e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Mode lokasi</Label>
              <Select
                value={form.locationMode}
                onValueChange={(v) => set("locationMode", v as LocationMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Di Lokasi</SelectItem>
                  <SelectItem value="remote">Bebas Lokasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.locationMode === "onsite" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="area">Area publik (kecamatan/kota)</Label>
                  <Input
                    id="area"
                    value={form.areaLabel}
                    placeholder="Contoh: Menteng, Jakarta Pusat"
                    onChange={(e) => set("areaLabel", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr">Alamat lengkap (privat)</Label>
                  <Input
                    id="addr"
                    value={form.exactAddress}
                    onChange={(e) => set("exactAddress", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hanya dibuka untuk pekerja yang sudah Anda kunci.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor kontak (privat)</Label>
                  <Input
                    id="phone"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Waktu pengerjaan</Label>
              <Select
                value={form.timingMode}
                onValueChange={(v) => set("timingMode", v as TimingMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Kerja Sekarang</SelectItem>
                  <SelectItem value="scheduled">Terikat Jadwal</SelectItem>
                  <SelectItem value="flexible">Fleksibel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-2">
              <Label>Struktur pembayaran</Label>
              <Select
                value={form.paymentType}
                onValueChange={(v) => set("paymentType", v as PaymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borongan">Borongan</SelectItem>
                  <SelectItem value="selesai_kerja">Selesai Kerja</SelectItem>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Nominal (IDR)</Label>
              <Input
                id="amount"
                type="number"
                min={10000}
                step={10000}
                value={form.paymentAmount}
                onChange={(e) => set("paymentAmount", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Dana ditahan di escrow: {rupiah(form.paymentAmount * form.headcount)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="head">Jumlah pekerja dibutuhkan</Label>
              <Input
                id="head"
                type="number"
                min={1}
                value={form.headcount}
                onChange={(e) => set("headcount", Math.max(1, Number(e.target.value)))}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <h2 className="text-base font-semibold">Ringkasan</h2>
            <SummaryRow label="Judul" value={form.title} />
            <SummaryRow
              label="Keahlian"
              value={(skillsQ.data ?? []).find((s) => s.id === form.skillId)?.name ?? "Umum"}
            />
            <SummaryRow
              label="Lokasi"
              value={form.locationMode === "remote" ? "Bebas Lokasi" : form.areaLabel}
            />
            <SummaryRow label="Waktu" value={form.timingMode} />
            <SummaryRow
              label="Pembayaran"
              value={`${rupiah(form.paymentAmount)} · ${form.paymentType}`}
            />
            <SummaryRow label="Kebutuhan pekerja" value={String(form.headcount)} />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            disabled={step === 1 || saving}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="me-2 size-4" />
            Kembali
          </Button>
          {step < 4 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Lanjut
              <ArrowRight className="ms-2 size-4" />
            </Button>
          ) : (
            <Button disabled={saving} onClick={() => void publish()}>
              {saving && <Loader2 className="me-2 size-4 animate-spin" />}
              Publikasikan
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value || "—"}</span>
    </div>
  );
}
