import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminRole = "admin_super" | "admin_moderator" | "admin_finance" | "admin_affiliate";

type Ctx = { supabase: any; userId: string };

async function assertRole(context: Ctx, roles: AdminRole[]) {
  const allowed: AdminRole[] = [...roles, "admin_super"];
  for (const role of allowed) {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: role,
    });
    if (data === true) return;
  }
  throw new Error("Forbidden: peran Anda tidak berwenang untuk aksi ini.");
}

export const setReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "kept", "deleted", "warned", "suspended", "dismissed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_moderator"]);
    const { error } = await (context as Ctx).supabase
      .from("reports")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moderateComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_moderator"]);
    const { error } = await (context as Ctx).supabase
      .from("comments")
      .update({ hidden: data.hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), flagged: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_moderator"]);
    const { error } = await (context as Ctx).supabase
      .from("reviews")
      .update({ flagged: data.flagged })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const settleEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["RELEASED", "REFUNDED"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_finance"]);
    const supabase = (context as Ctx).supabase;
    const { data: row, error: readError } = await supabase
      .from("transactions_escrow")
      .select("id, job_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Transaksi escrow tidak ditemukan.");

    const { error } = await supabase
      .from("transactions_escrow")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase
      .from("jobs")
      .update({ status: data.status === "RELEASED" ? "COMPLETED" : "CANCELLED" })
      .eq("id", row.job_id);
    return { ok: true };
  });

export const setWithdrawalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["pending", "paid", "rejected"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_finance"]);
    const { error } = await (context as Ctx).supabase
      .from("withdrawals")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const depositEnterpriseBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), amount: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_finance"]);
    const supabase = (context as Ctx).supabase;
    const { data: row, error: readError } = await supabase
      .from("enterprise_profiles")
      .select("id, total_budget")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Mitra institusi tidak ditemukan.");
    const { error } = await supabase
      .from("enterprise_profiles")
      .update({ total_budget: Number(row.total_budget) + data.amount })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setEnterpriseBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        badge_status: z.enum(["pending", "verified", "rejected"]),
        badge_kind: z.enum(["enterprise", "pemda", "bumn", "csr"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, ["admin_affiliate"]);
    const patch: Record<string, string> = { badge_status: data.badge_status };
    if (data.badge_kind) patch['badge_kind'] = data.badge_kind;
    const { error } = await (context as Ctx).supabase
      .from("enterprise_profiles")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin_super", "admin_moderator", "admin_finance", "admin_affiliate"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, []);
    const { error } = await (context as Ctx).supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin_super", "admin_moderator", "admin_finance", "admin_affiliate"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as Ctx, []);
    const { error } = await (context as Ctx).supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context as Ctx).supabase.rpc("admin_platform_stats");
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) ?? null;
    return (row ?? {
      total_users: 0,
      total_workers: 0,
      total_jobs: 0,
      open_jobs: 0,
      completed_jobs: 0,
      gmv: 0,
      commission: 0,
    }) as {
      total_users: number;
      total_workers: number;
      total_jobs: number;
      open_jobs: number;
      completed_jobs: number;
      gmv: number;
      commission: number;
    };
  });
