import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Job = Tables<"jobs">;
export type ProfileRow = Tables<"profiles">;
export type Skill = Tables<"skills">;
export type Comment = Tables<"comments">;
export type Review = Tables<"reviews">;
export type Portfolio = Tables<"portfolios">;
export type Escrow = Tables<"transactions_escrow">;
export type Withdrawal = Tables<"withdrawals">;
export type EnterpriseProfile = Tables<"enterprise_profiles">;
export type Conversation = Tables<"conversations">;
export type DirectMessage = Tables<"direct_messages">;
export type Report = Tables<"reports">;

export type JobWithRefs = Job & {
  client: Pick<
    ProfileRow,
    "id" | "full_name" | "avatar_url" | "kind" | "ktp_verified" | "domisili"
  > | null;
  skill: Pick<Skill, "id" | "name"> | null;
};

const JOB_SELECT =
  "*, client:profiles!jobs_client_id_fkey(id, full_name, avatar_url, kind, ktp_verified, domisili), skill:skills(id, name)";

export async function fetchJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, skill:skills(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const jobs = (data ?? []) as (Job & { skill: Pick<Skill, "id" | "name"> | null })[];
  const clientIds = [...new Set(jobs.map((j) => j.client_id))];
  const clients = await fetchProfilesByIds(clientIds);
  return jobs.map((j) => ({ ...j, client: clients[j.client_id] ?? null })) as JobWithRefs[];
}

export async function fetchJob(id: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, skill:skills(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const job = data as Job & { skill: Pick<Skill, "id" | "name"> | null };
  const clients = await fetchProfilesByIds([job.client_id]);
  return { ...job, client: clients[job.client_id] ?? null } as JobWithRefs;
}

export async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, ProfileRow>;
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  const map: Record<string, ProfileRow> = {};
  for (const row of (data ?? []) as ProfileRow[]) map[row.id] = row;
  return map;
}

export async function fetchWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("kind", "worker")
    .order("rating", { ascending: false });
  if (error) throw error;
  const workers = (data ?? []) as ProfileRow[];
  const { data: ws } = await supabase.from("worker_skills").select("worker_id, skills(id, name)");
  const skillMap: Record<string, string[]> = {};
  for (const row of (ws ?? []) as { worker_id: string; skills: { name: string } | null }[]) {
    if (!row.skills) continue;
    skillMap[row.worker_id] = [...(skillMap[row.worker_id] ?? []), row.skills.name];
  }
  return workers.map((w) => ({ ...w, skills: skillMap[w.id] ?? [] }));
}

export type WorkerWithSkills = ProfileRow & { skills: string[] };

export async function fetchWorker(id: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: ws } = await supabase
    .from("worker_skills")
    .select("skills(name)")
    .eq("worker_id", id);
  const skills = ((ws ?? []) as { skills: { name: string } | null }[])
    .map((r) => r.skills?.name)
    .filter((n): n is string => Boolean(n));
  return { ...(data as ProfileRow), skills };
}

export async function fetchComments(jobId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("job_id", jobId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const comments = (data ?? []) as Comment[];
  const authors = await fetchProfilesByIds([...new Set(comments.map((c) => c.user_id))]);
  return comments.map((c) => ({ ...c, author: authors[c.user_id] ?? null }));
}

export type CommentWithAuthor = Comment & { author: ProfileRow | null };

export async function fetchReviews(workerId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function fetchPortfolios(workerId: string) {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Portfolio[];
}

export async function fetchEnterpriseProfiles() {
  const { data, error } = await supabase
    .from("enterprise_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EnterpriseProfile[];
}

export async function fetchEnterpriseByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from("enterprise_profiles")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return (data as EnterpriseProfile | null) ?? null;
}

export async function fetchSkills() {
  const { data, error } = await supabase.from("skills").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Skill[];
}

export type JobWithSkill = Job & { skill: Pick<Skill, "id" | "name"> | null };

export async function fetchJobsByClient(clientId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, skill:skills(id, name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobWithSkill[];
}

export async function fetchJobsByWorker(workerId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, skill:skills(id, name)")
    .eq("locked_worker_id", workerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobWithSkill[];
}

export async function fetchMyBids(userId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*, job:jobs(*)")
    .eq("user_id", userId)
    .not("bid_amount", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Comment & { job: Job | null })[];
}

export async function fetchEscrowsByJobIds(jobIds: string[]) {
  if (jobIds.length === 0) return {} as Record<string, Escrow>;
  const { data, error } = await supabase
    .from("transactions_escrow")
    .select("*")
    .in("job_id", jobIds);
  if (error) throw error;
  const map: Record<string, Escrow> = {};
  for (const row of (data ?? []) as Escrow[]) map[row.job_id] = row;
  return map;
}

export async function fetchBidCounts(jobIds: string[]) {
  if (jobIds.length === 0) return {} as Record<string, number>;
  const { data, error } = await supabase
    .from("comments")
    .select("job_id, bid_amount")
    .in("job_id", jobIds)
    .not("bid_amount", "is", null);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { job_id: string }[]) {
    map[row.job_id] = (map[row.job_id] ?? 0) + 1;
  }
  return map;
}

export async function fetchReviewsByJobIds(jobIds: string[]) {
  if (jobIds.length === 0) return {} as Record<string, Review>;
  const { data, error } = await supabase.from("reviews").select("*").in("job_id", jobIds);
  if (error) throw error;
  const map: Record<string, Review> = {};
  for (const row of (data ?? []) as Review[]) if (row.job_id) map[row.job_id] = row;
  return map;
}

export async function fetchActiveWorkCount(workerId: string) {
  const { count, error } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("locked_worker_id", workerId)
    .in("status", ["IN_PROGRESS", "SUBMITTED"]);
  if (error) throw error;
  return count ?? 0;
}

export { JOB_SELECT };
