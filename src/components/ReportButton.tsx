import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  targetType: "comment" | "review" | "message" | "job" | "profile";
  targetId: string;
  preview?: string | null;
};

export function ReportButton({ targetType, targetId, preview }: Props) {
  const { user, openLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user!.id,
      target_type: targetType,
      target_id: targetId,
      target_preview: preview ? preview.slice(0, 240) : null,
      reason: reason.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Gagal mengirim laporan", { description: error.message });
      return;
    }
    setOpen(false);
    setReason("");
    toast.success("Laporan terkirim ke tim moderasi");
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => (user ? setOpen(true) : openLogin())}
      >
        <Flag className="me-1 size-3" /> Laporkan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan konten</DialogTitle>
            <DialogDescription>
              Jelaskan alasan pelaporan. Tim moderasi akan meninjau dalam waktu 1x24 jam.
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{preview}</p>
          ) : null}
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: penipuan, kontak di luar platform, ujaran kebencian…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button disabled={sending || !reason.trim()} onClick={() => void submit()}>
              Kirim laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
