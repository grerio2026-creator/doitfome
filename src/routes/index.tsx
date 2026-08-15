import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHelping, Landmark, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import { JobCard } from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { fetchEnterpriseProfiles, fetchJobs, fetchWorkers } from "@/lib/queries";

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

function Landing() {
  const { t } = useI18n();
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const workers = useQuery({ queryKey: ["workers"], queryFn: fetchWorkers });
  const orgs = useQuery({ queryKey: ["enterprises"], queryFn: fetchEnterpriseProfiles });

  const highlight = (jobs.data ?? []).filter((j) => j.status === "OPEN").slice(0, 4);
  const institutional = (jobs.data ?? []).filter((j) => j.is_institutional).slice(0, 3);

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Sparkles className="size-3.5" />
            {t("brand_tagline")}
          </Badge>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t("hero_sub")}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card className="gap-3 border-2 border-primary/30 p-5 shadow-soft">
              <HandHelping className="size-8 text-primary" />
              <h2 className="text-xl font-bold">{t("path_client_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("path_client_sub")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/post-job">
                    {t("cta_post_job")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/workers">{t("nav_workers")}</Link>
                </Button>
              </div>
            </Card>
            <Card className="gap-3 border-2 border-action/40 p-5 shadow-soft">
              <Wrench className="size-8 text-action" />
              <h2 className="text-xl font-bold">{t("path_worker_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("path_worker_sub")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild className="bg-action text-action-foreground hover:bg-action/90">
                  <Link to="/jobs">
                    {t("cta_explore")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/jobs" search={{ tab: "gov" }}>
                    {t("tab_gov")}
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { n: workers.data?.length ?? 0, l: t("stat_workers") },
              { n: highlight.length ? (jobs.data?.length ?? 0) : 0, l: t("stat_jobs") },
              { n: orgs.data?.length ?? 0, l: t("stat_institutions") },
            ].map((s) => (
              <Card key={s.l} className="items-center gap-0 p-4 text-center">
                <p className="text-2xl font-extrabold text-primary">{s.n}</p>
                <p className="text-xs text-muted-foreground">{s.l}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold">{t("how_title")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { i: 1, t: t("how_1"), d: t("how_1_d") },
            { i: 2, t: t("how_2"), d: t("how_2_d") },
            { i: 3, t: t("how_3"), d: t("how_3_d") },
          ].map((s) => (
            <Card key={s.i} className="gap-2 p-5">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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

      {institutional.length ? (
        <section className="border-y border-border bg-card py-10">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-2">
              <Landmark className="size-5 text-gold" />
              <h2 className="text-xl font-bold">{t("tab_gov")}</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {institutional.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">{t("feed_title")}</h2>
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
    </div>
  );
}
