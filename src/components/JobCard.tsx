import { Link } from "@tanstack/react-router";
import { Clock, Globe2, MapPin, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTime, rupiah, timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { JobWithRefs } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function JobCard({ job, distance }: { job: JobWithRefs; distance?: number | null }) {
  const { t } = useI18n();
  const institutional = job.is_institutional;

  return (
    <Card
      className={cn(
        "gap-3 p-4 shadow-soft transition-shadow hover:shadow-lift",
        institutional && "border-2 border-primary/60 bg-accent/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {job.timing_mode === "urgent" ? (
          <Badge className="gap-1 bg-destructive text-destructive-foreground hover:bg-destructive">
            <Zap className="size-3.5" />
            {t("urgent")}
          </Badge>
        ) : null}
        {job.timing_mode === "scheduled" ? (
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3.5" />
            {t("scheduled")}
          </Badge>
        ) : null}
        {job.location_mode === "remote" ? (
          <Badge variant="outline" className="gap-1">
            <Globe2 className="size-3.5" />
            {t("remote")}
          </Badge>
        ) : null}
        {institutional ? (
          <Badge className="bg-gold text-gold-foreground hover:bg-gold">
            {job.institution_kind === "pemda" ? `🏛️ ${t("padat_karya")}` : `🏢 ${t("csr_official")}`}
          </Badge>
        ) : null}
        {job.skill?.name ? <Badge variant="secondary">{job.skill.name}</Badge> : null}
      </div>

      <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="group">
        <h3 className="text-base font-semibold leading-snug group-hover:text-primary">
          {job.title}
        </h3>
      </Link>
      <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {job.location_mode === "remote" ? t("remote") : (job.area_label ?? "-")}
          {distance != null ? ` • ${distance} km` : ""}
        </span>
        {job.headcount > 1 ? (
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <Users className="size-3.5" />
            {t("needed_workers", { n: job.headcount })}
          </span>
        ) : null}
        {job.expires_at ? <span>Deadline {formatDateTime(job.expires_at)}</span> : null}
        <span>{timeAgo(job.created_at)}</span>
      </div>

      <div className="flex items-end justify-between gap-2 border-t border-border pt-3">
        <div>
          <p className="text-lg font-bold text-action">{rupiah(job.payment_amount)}</p>
          <p className="text-xs text-muted-foreground">
            {t(`payment_${job.payment_type}` as "payment_harian")}
          </p>
        </div>
        <p className="max-w-[55%] truncate text-end text-xs text-muted-foreground">
          {job.client?.full_name ?? "-"}
        </p>
      </div>
    </Card>
  );
}
