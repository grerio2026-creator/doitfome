import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { distanceKm } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { fetchJobs, type JobWithRefs } from "@/lib/queries";

type Tab = "skill" | "near" | "new" | "remote" | "gov";

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => {
    const tab = search['tab'];
    const allowed: Tab[] = ["skill", "near", "new", "remote", "gov"];
    return typeof tab === "string" && allowed.includes(tab as Tab) ? { tab: tab as Tab } : {};
  },
  head: () => ({
    meta: [
      { title: "Feed Pekerjaan Terdekat — DoIt4Me" },
      {
        name: "description",
        content:
          "Jelajahi pekerjaan harian, borongan, remote, serta program Padat Karya Pemda dan CSR di sekitar Anda.",
      },
      { property: "og:title", content: "Feed Pekerjaan Terdekat — DoIt4Me" },
      {
        property: "og:description",
        content: "Pekerjaan diurutkan berdasarkan kecocokan keahlian dan jarak terdekat.",
      },
    ],
  }),
  component: JobFeed,
});

function JobFeed() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "new");
  const [q, setQ] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.lat != null && profile?.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null,
  );

  const jobs = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Perangkat tidak mendukung GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTab("near");
        toast.success("Lokasi terdeteksi. Pekerjaan diurutkan dari yang terdekat.");
      },
      () => toast.error("Tidak bisa mengambil lokasi. Aktifkan izin lokasi."),
    );
  };

  const withDistance = useMemo(() => {
    const list = (jobs.data ?? []).filter((j) => j.status === "OPEN");
    return list.map((job) => ({
      job,
      distance:
        coords && job.lat != null && job.lng != null
          ? distanceKm(coords.lat, coords.lng, job.lat, job.lng)
          : null,
    }));
  }, [jobs.data, coords]);

  const filtered = useMemo(() => {
    let list = withDistance;
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (x) =>
          x.job.title.toLowerCase().includes(needle) ||
          x.job.description.toLowerCase().includes(needle) ||
          (x.job.skill?.name ?? "").toLowerCase().includes(needle),
      );
    }
    if (tab === "remote") list = list.filter((x) => x.job.location_mode === "remote");
    if (tab === "gov") list = list.filter((x) => x.job.is_institutional);
    if (tab === "near")
      list = [...list].sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    if (tab === "new")
      list = [...list].sort((a, b) => b.job.created_at.localeCompare(a.job.created_at));
    if (tab === "skill") {
      const mySkill = profile?.headline?.toLowerCase() ?? "";
      list = [...list].sort((a, b) => {
        const score = (j: JobWithRefs) =>
          (mySkill && (j.skill?.name ?? "").toLowerCase().includes(mySkill.split(" ")[0] ?? "")
            ? -10
            : 0) + (j.timing_mode === "urgent" ? -1 : 0);
        return score(a.job) - score(b.job);
      });
    }
    return list;
  }, [withDistance, tab, q, profile?.headline]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t("feed_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("feed_sub")}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pekerjaan, keahlian, area…"
            className="ps-9"
          />
        </div>
        <Button variant="outline" onClick={useGps} className="gap-1">
          <Crosshair className="size-4" />
          Gunakan GPS
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="skill">{t("tab_skill")}</TabsTrigger>
          <TabsTrigger value="near">{t("tab_near")}</TabsTrigger>
          <TabsTrigger value="new">{t("tab_new")}</TabsTrigger>
          <TabsTrigger value="remote">{t("tab_remote")}</TabsTrigger>
          <TabsTrigger value="gov">{t("tab_gov")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {jobs.isLoading ? <p className="text-sm text-muted-foreground">{t("loading")}</p> : null}
        {filtered.map(({ job, distance }) => (
          <JobCard key={job.id} job={job} distance={distance} />
        ))}
        {!jobs.isLoading && filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
