import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Building2, Globe } from "lucide-react";

import { OfficialBadge } from "@/components/Badges";
import { JobCard } from "@/components/JobCard";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/format";
import { fetchEnterpriseByOwner } from "@/lib/queries";
import type { EnterpriseProfile, Job, Skill } from "@/lib/queries";

type ShowcaseData = {
  profile: EnterpriseProfile;
  jobs: (Job & { skill: Pick<Skill, "id" | "name"> | null })[];
};

function showcaseQuery(ownerId: string) {
  return queryOptions({
    queryKey: ["enterprise", ownerId],
    queryFn: async (): Promise<ShowcaseData> => {
      const profile = await fetchEnterpriseByOwner(ownerId);
      if (!profile) throw notFound();
      const { data, error } = await supabase
        .from("jobs")
        .select("*, skill:skills(id, name)")
        .eq("client_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return {
        profile,
        jobs: (data ?? []) as ShowcaseData["jobs"],
      };
    },
  });
}

export const Route = createFileRoute("/enterprise/$ownerId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(showcaseQuery(params.ownerId)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Mitra institusi tidak ditemukan — DoIt4Me" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.profile;
    const title = `${p.legal_name} — Mitra Institusi DoIt4Me`;
    const description =
      p.mission?.slice(0, 155) ??
      `${p.legal_name} membuka lapangan kerja hyperlocal melalui DoIt4Me: ${p.workers_absorbed} pekerja terserap dari ${p.total_projects} proyek.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Profil tidak dapat dimuat</h1>
      <p className="mt-2 text-sm text-muted-foreground">Silakan coba lagi beberapa saat lagi.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Mitra institusi tidak ditemukan</h1>
      <Link to="/jobs" className="mt-3 inline-block text-sm text-primary underline">
        Jelajahi pekerjaan
      </Link>
    </div>
  ),
  component: EnterprisePage,
});

function EnterprisePage() {
  const { ownerId } = Route.useParams();
  const { data } = useSuspenseQuery(showcaseQuery(ownerId));
  const p = data.profile;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          {p.logo_url ? (
            <img
              src={p.logo_url}
              alt={`Logo ${p.legal_name}`}
              loading="lazy"
              className="size-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Building2 className="size-7 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{p.legal_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {p.badge_status === "verified" && <OfficialBadge kind={p.badge_kind} />}
              {p.hq_address && <span>{p.hq_address}</span>}
            </div>
          </div>
        </div>
        {p.mission && <p className="mt-4 text-sm text-muted-foreground">{p.mission}</p>}
        {p.website && (
          <a
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline"
            href={p.website}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Globe className="size-4" /> {p.website}
          </a>
        )}
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Pekerja terserap" value={String(p.workers_absorbed)} />
        <Metric label="Total proyek" value={String(p.total_projects)} />
        <Metric label="Total anggaran" value={rupiah(Number(p.total_budget))} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Pekerjaan dari institusi ini</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {data.jobs.map((job) => (
          <JobCard key={job.id} job={{ ...job, client: null }} />
        ))}
      </div>
      {data.jobs.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Belum ada pekerjaan yang dipublikasikan.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </Card>
  );
}
