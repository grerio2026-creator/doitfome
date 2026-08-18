import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "OPEN", label: "Diposting" },
  { key: "IN_PROGRESS", label: "Pekerja dikunci" },
  { key: "SUBMITTED", label: "Hasil dikirim" },
  { key: "COMPLETED", label: "Selesai & dibayar" },
] as const;

export function JobProgress({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "DISPUTED") {
    return (
      <p className="rounded-lg bg-muted p-2 text-xs font-medium text-muted-foreground">
        {status === "CANCELLED" ? "Pekerjaan dibatalkan" : "Dalam sengketa — ditinjau moderasi"}
      </p>
    );
  }
  const active = Math.max(
    STEPS.findIndex((s) => s.key === status),
    0,
  );

  return (
    <ol className="flex items-start gap-1">
      {STEPS.map((step, i) => {
        const done = i <= active;
        return (
          <li key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-border")} />
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === STEPS.length - 1 ? "bg-transparent" : i < active ? "bg-primary" : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] leading-tight",
                done ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
