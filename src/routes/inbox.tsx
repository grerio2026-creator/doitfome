import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { containsSensitive, maskSensitive, timeAgo } from "@/lib/format";
import { fetchProfilesByIds, type Conversation, type DirectMessage } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Pesan & Negosiasi — DoIt4Me" },
      {
        name: "description",
        content:
          "Chat langsung dengan klien atau pekerja. Nomor telepon dan rekening otomatis disamarkan sebelum escrow aktif.",
      },
      { property: "og:title", content: "Pesan & Negosiasi — DoIt4Me" },
      {
        property: "og:description",
        content: "Kelola percakapan pekerjaan Anda dengan perlindungan data kontak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { user, openLogin } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const convQ = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`client_id.eq.${user!.id},worker_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Conversation[];
      const others = rows.map((c) => (c.client_id === user!.id ? c.worker_id : c.client_id));
      const profiles = await fetchProfilesByIds([...new Set(others)]);
      return rows.map((c) => ({
        ...c,
        other: profiles[c.client_id === user!.id ? c.worker_id : c.client_id] ?? null,
      }));
    },
  });

  const msgQ = useQuery({
    queryKey: ["messages", activeId],
    enabled: Boolean(activeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DirectMessage[];
    },
  });

  const conversations = convQ.data ?? [];
  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0]!.id);
  }, [activeId, conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const masked = active?.kind !== "active";

  async function send() {
    if (!user || !activeId || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase
      .from("direct_messages")
      .insert({ conversation_id: activeId, sender_id: user.id, body });
    if (!error) void queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">{t("inbox_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masuk untuk melihat percakapan Anda.
        </p>
        <Button className="mt-4" onClick={() => openLogin()}>
          {t("sign_in")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t("inbox_title")}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="divide-y p-0">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Belum ada percakapan.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 p-3 text-start transition-colors hover:bg-muted/60 ${
                c.id === activeId ? "bg-muted" : ""
              }`}
            >
              <Avatar className="size-9">
                <AvatarImage src={c.other?.avatar_url ?? undefined} />
                <AvatarFallback>{c.other?.full_name?.slice(0, 2) ?? "??"}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {c.other?.full_name ?? "Pengguna"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {c.kind === "active" ? "Proyek aktif" : "Tanya-tanya"}
                </span>
              </span>
            </button>
          ))}
        </Card>

        <Card className="flex min-h-[420px] flex-col p-0">
          {!active ? (
            <p className="p-6 text-sm text-muted-foreground">Pilih percakapan.</p>
          ) : (
            <>
              <div className="border-b p-3 text-sm font-semibold">
                {active.other?.full_name ?? "Pengguna"}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {(msgQ.data ?? []).map((m) => {
                  const mine = m.sender_id === user.id;
                  const body = masked ? maskSensitive(m.body) : m.body;
                  return (
                    <div key={m.id} className={mine ? "text-end" : "text-start"}>
                      <div
                        className={`inline-block max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {body}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {timeAgo(m.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {masked && (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {t("masked_note")}
                </p>
              )}
              <div className="flex items-center gap-2 border-t p-3">
                <Input
                  value={draft}
                  placeholder="Tulis pesan…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void send();
                  }}
                />
                <Button size="icon" onClick={() => void send()}>
                  <Send className="size-4" />
                </Button>
              </div>
              {masked && containsSensitive(draft) && (
                <p className="px-4 pb-3 text-xs text-destructive">
                  Kontak akan disamarkan sampai escrow aktif.
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
