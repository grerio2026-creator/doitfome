import { useState } from "react";
import { Loader2, Building2, User, HardHat, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Kind = "client_individual" | "client_enterprise" | "worker";

export function AuthModal({
  open,
  reason,
  onOpenChange,
}: {
  open: boolean;
  reason?: string | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>("client_individual");
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const kinds: { value: Kind; label: string; icon: typeof User }[] = [
    { value: "client_individual", label: t("client_individual"), icon: User },
    { value: "client_enterprise", label: t("client_enterprise"), icon: Building2 },
    { value: "worker", label: t("worker"), icon: HardHat },
  ];

  async function googleSignIn() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in gagal", { description: result.error.message });
        return;
      }
      if (result.redirected) return;
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      toast.error("Nomor tidak valid", { description: "Gunakan format +628xxxxxxxxx" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.replace(/[\s-]/g, ""),
      options: { data: { kind } },
    });
    setBusy(false);
    if (error) {
      toast.error("OTP belum bisa dikirim", {
        description:
          "Pengiriman SMS/WhatsApp perlu diaktifkan di pengaturan login. Sementara gunakan Google atau email.",
      });
      return;
    }
    setOtpSent(true);
    toast.success(t("otp_sent"));
  }

  async function verifyOtp() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/[\s-]/g, ""),
      token: otp,
      type: "sms",
    });
    setBusy(false);
    if (error) {
      toast.error("Kode salah", { description: error.message });
      return;
    }
    onOpenChange(false);
  }

  async function emailAuth(mode: "in" | "up") {
    setBusy(true);
    const fn =
      mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { data: { kind }, emailRedirectTo: window.location.origin },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(mode === "in" ? "Gagal masuk" : "Gagal mendaftar", {
        description: error.message,
      });
      return;
    }
    toast.success(mode === "in" ? "Berhasil masuk" : "Akun dibuat");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("login_title")}</DialogTitle>
          <DialogDescription>{reason ?? t("login_sub")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("register_as")}</Label>
          <div className="grid gap-2">
            {kinds.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-start text-sm transition-colors",
                  kind === k.value
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                <k.icon className="size-4 shrink-0" />
                <span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={googleSignIn} disabled={busy} className="w-full" size="lg">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("google_login")}
        </Button>

        <Tabs defaultValue="phone">
          <TabsList className="w-full">
            <TabsTrigger value="phone" className="flex-1">
              WhatsApp OTP
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1">
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phone_login")}</Label>
              <Input
                id="phone"
                inputMode="tel"
                maxLength={20}
                placeholder="+628123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {otpSent ? (
              <div className="space-y-1.5">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            ) : null}
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={otpSent ? verifyOtp : sendOtp}
            >
              <MessageCircle className="size-4" />
              {otpSent ? t("verify_otp") : t("send_otp")}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => emailAuth("in")}
              >
                {t("sign_in")}
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => emailAuth("up")}>
                Daftar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
