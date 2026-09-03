import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bike,
  Camera,
  Hammer,
  HandHelping,
  Landmark,
  Palette,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/hero-people.png";
import { JobCard } from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import {
  fetchJobCountsBySkill,
  fetchJobs,
  fetchPlatformStats,
  fetchSkills,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoIt4Me — Bantuan Terdekat, Dikerjakan Hari Ini" },
      {
        name: "description",
        content:
          "Pasang pekerjaan atau cari kerja instan di sekitar Anda. Escrow aman, pekerja terverifikasi, program Pemda & CSR.",
      },
      { property: "og:title", content: "DoIt4Me — Marketplace Jasa Hiperlokal" },
      {
        property: "og:description",
        content: "Hubungkan klien, Pemda, BUMN, dan CSR dengan pekerja terverifikasi terdekat.",
      },
    ],
  }),
  component: Landing,
});

const ICONS: Record<string, LucideIcon> = {
  palette: Palette,
  camera: Camera,
  plug: Plug,
  sparkles: Sparkles,
  bike: Bike,
  hammer: Hammer,
  wrench: Wrench,
};

function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const jobs = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const skills = useQuery({ queryKey: ["skills"], queryFn: fetchSkills });
  const stats = useQuery({ queryKey: ["platform-stats"], queryFn: fetchPlatformStats });
  const skillCounts = useQuery({ queryKey: ["job-counts-skill"], queryFn: fetchJobCountsBySkill });

  const open = (jobs.data ?? []).filter((j) => j.status === "OPEN");
  const highlight = open.slice(0, 4);
  const institutional = open.filter((j) => j.is_institutional).slice(0, 3);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/jobs", search: q.trim() ? { q: q.trim() } : {} });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Search bar */}
      <form onSubmit={submitSearch} className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_placeholder")}
          className="h-12 rounded-2xl border-border bg-card ps-11 shadow-soft"
        />
      </form>

      {/* Hero banner */}
      <section className="mt-5 overflow-hidden rounded-3xl bg-primary-gradient shadow-lift">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-9">
          <div className="flex-1">
            <Badge className="mb-3 gap-1 border-0 bg-primary-foreground/15 text-primary-foreground">
              <Sparkles className="size-3.5" />
              {t("hero_badge")}
            </Badge>
            <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-4xl">
              {t("hero_title")}
            </h1>
            <p className="mt-3 max-w-lg text-sm text-primary-foreground/85">{t("hero_sub")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="lg" variant="secondary" className="rounded-xl">
                <Link to="/post-job">
                  {t("cta_post_job")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-action text-action-foreground hover:bg-action/90"
              >
                <Link to="/jobs">{t("cta_explore")}</Link>
              </Button>
            </div>
          </div>
          <img
            src={heroImage}
            alt="Ilustrasi pekerja dan klien DoIt4Me"
            className="mx-auto w-56 shrink-0 drop-shadow-xl sm:w-72"
            loading="eager"
          />
        </div>
      </section>

      {/* Categories from database */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">{t("cat_title")}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/jobs">
              {t("cat_all")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {(skills.data ?? []).map((s) => {
            const Icon = ICONS[s.icon ?? ""] ?? Wrench;
            const count = skillCounts.data?.[s.id] ?? 0;
            return (
              <Link
                key={s.id}
                to="/jobs"
                search={{ skill: s.id }}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-semibold leading-tight">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">{count} pekerjaan</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Statistics from database */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          {
            v: stats.data?.verifiedWorkers ?? 0,
            l: t("stat_workers"),
            icon: ShieldCheck,
            suffix: "",
          },
          { v: stats.data?.activeJobs ?? 0, l: t("stat_jobs"), icon: Wrench, suffix: "" },
          { v: stats.data?.satisfaction ?? 0, l: t("stat_satisfaction"), icon: Star, suffix: "%" },
        ].map((s) => (
          <Card key={s.l} className="flex-row items-center gap-3 p-5 shadow-soft">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-primary">
                {s.v}
                {s.suffix}
              </p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Two paths */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="gap-3 border-2 border-primary/25 p-5 shadow-soft">
          <HandHelping className="size-8 text-primary" />
          <h2 className="text-lg font-bold">{t("path_client_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("path_client_sub")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/post-job">{t("cta_post_job")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workers">{t("nav_workers")}</Link>
            </Button>
          </div>
        </Card>
        <Card className="gap-3 border-2 border-action/35 p-5 shadow-soft">
          <Wrench className="size-8 text-action" />
          <h2 className="text-lg font-bold">{t("path_worker_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("path_worker_sub")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-action text-action-foreground hover:bg-action/90">
              <Link to="/jobs">{t("cta_explore")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/jobs" search={{ tab: "gov" }}>
                {t("tab_gov")}
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Institutional programs */}
      {institutional.length ? (
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Landmark className="size-5 text-gold" />
            <h2 className="text-lg font-bold">{t("tab_gov")}</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {institutional.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recommended jobs */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold">{t("rec_title")}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/jobs">
              {t("cta_explore")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {jobs.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            highlight.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("how_title")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { i: 1, t: t("how_1"), d: t("how_1_d") },
            { i: 2, t: t("how_2"), d: t("how_2_d") },
            { i: 3, t: t("how_3"), d: t("how_3_d") },
          ].map((s) => (
            <Card key={s.i} className="gap-2 p-5">
              <span className="grid size-8 place-items-center rounded-full bg-primary-gradient text-sm font-bold text-primary-foreground">
                {s.i}
              </span>
              <p className="font-semibold">{s.t}</p>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4 flex-row items-center gap-3 bg-accent/50 p-4">
          <ShieldCheck className="size-6 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">{t("escrow_note")}</p>
        </Card>
      </section>
    </div>
  );
}
