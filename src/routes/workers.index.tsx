import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StarRating, VerifiedBadge } from "@/components/Badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { fetchWorkers } from "@/lib/queries";

export const Route = createFileRoute("/workers/")({
  head: () => ({
    meta: [
      { title: "Cari Pekerja Terverifikasi — DoIt4Me" },
      {
        name: "description",
        content:
          "Telusuri tukang, teknisi, dan freelancer terverifikasi berdasarkan keahlian, rating, dan domisili.",
      },
      { property: "og:title", content: "Cari Pekerja Terverifikasi — DoIt4Me" },
      {
        property: "og:description",
        content: "Lihat portofolio, rating, dan tawarkan proyek langsung ke pekerja pilihan Anda.",
      },
    ],
  }),
  component: WorkerDirectory,
});

function WorkerDirectory() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const workersQ = useQuery({ queryKey: ["workers"], queryFn: fetchWorkers });

  const list = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return workersQ.data ?? [];
    return (workersQ.data ?? []).filter(
      (w) =>
        w.full_name.toLowerCase().includes(needle) ||
        (w.headline ?? "").toLowerCase().includes(needle) ||
        (w.domisili ?? "").toLowerCase().includes(needle) ||
        w.skills.some((s) => s.toLowerCase().includes(needle)),
    );
  }, [q, workersQ.data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t("workers_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("workers_sub")}</p>

      <div className="relative mt-5 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tukang listrik, desainer, Bandung…"
          className="ps-9"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workersQ.isLoading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : null}
        {list.map((w) => (
          <Card key={w.id} className="gap-3 p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={w.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{w.full_name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{w.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{w.headline ?? "-"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating value={w.rating} count={w.jobs_completed} />
              {w.ktp_verified ? <VerifiedBadge /> : null}
            </div>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" /> {w.domisili ?? "-"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {w.skills.slice(0, 4).map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-1">
              <Link to="/workers/$workerId" params={{ workerId: w.id }}>
                {t("portfolio")}
              </Link>
            </Button>
          </Card>
        ))}
        {!workersQ.isLoading && list.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
