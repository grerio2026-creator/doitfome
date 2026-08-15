import { BadgeCheck, Building2, Landmark, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  count,
  className,
}: {
  value: number;
  count?: number | undefined;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", className)}>
      <Star className="size-4 fill-gold text-gold" />
      {value.toFixed(1)}
      {count != null ? (
        <span className="text-xs font-normal text-muted-foreground">({count})</span>
      ) : null}
    </span>
  );
}

export function VerifiedBadge({ label = "KTP Terverifikasi" }: { label?: string }) {
  return (
    <Badge variant="secondary" className="gap-1 bg-accent text-accent-foreground">
      <BadgeCheck className="size-3.5" />
      {label}
    </Badge>
  );
}

export function OfficialBadge({ kind }: { kind: string | null | undefined }) {
  if (kind === "pemda") {
    return (
      <Badge className="gap-1 bg-gold text-gold-foreground hover:bg-gold">
        <Landmark className="size-3.5" />
        🏛️ Pemda Official
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
      <Building2 className="size-3.5" />
      🏢 Verified Enterprise / CSR
    </Badge>
  );
}
