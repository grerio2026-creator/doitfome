-- Reports: moderation-only
DROP POLICY IF EXISTS "reports admin update" ON public.reports;
CREATE POLICY "reports moderation update" ON public.reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin_moderator') OR public.has_role(auth.uid(), 'admin_super'));

DROP POLICY IF EXISTS "reports owner or admin read" ON public.reports;
CREATE POLICY "reports owner or moderation read" ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin_moderator') OR public.has_role(auth.uid(), 'admin_super'));

-- Comments: owner or moderation
DROP POLICY IF EXISTS "comments moderate" ON public.comments;
CREATE POLICY "comments moderate" ON public.comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin_moderator') OR public.has_role(auth.uid(), 'admin_super'));

DROP POLICY IF EXISTS "comments delete" ON public.comments;
CREATE POLICY "comments delete" ON public.comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin_moderator') OR public.has_role(auth.uid(), 'admin_super'));

-- Reviews: owner or moderation
DROP POLICY IF EXISTS "reviews moderate" ON public.reviews;
CREATE POLICY "reviews moderate" ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin_moderator') OR public.has_role(auth.uid(), 'admin_super'));

-- Escrow: participants or finance
DROP POLICY IF EXISTS "escrow update" ON public.transactions_escrow;
CREATE POLICY "escrow update" ON public.transactions_escrow FOR UPDATE TO authenticated
USING (
  auth.uid() = client_id OR auth.uid() = worker_id
  OR public.has_role(auth.uid(), 'admin_finance') OR public.has_role(auth.uid(), 'admin_super')
);

-- Role management: super admin only
CREATE POLICY "user_roles super insert" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin_super'));

CREATE POLICY "user_roles super delete" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin_super'));

GRANT INSERT, DELETE ON public.user_roles TO authenticated;

-- Platform totals for admin dashboards
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS TABLE (
  total_users bigint,
  total_workers bigint,
  total_jobs bigint,
  open_jobs bigint,
  completed_jobs bigint,
  gmv bigint,
  commission bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.profiles WHERE kind = 'worker'),
    (SELECT count(*) FROM public.jobs),
    (SELECT count(*) FROM public.jobs WHERE status = 'OPEN'),
    (SELECT count(*) FROM public.jobs WHERE status = 'COMPLETED'),
    (SELECT COALESCE(sum(amount), 0)::bigint FROM public.transactions_escrow),
    (SELECT COALESCE(sum(commission), 0)::bigint FROM public.transactions_escrow)
  WHERE public.is_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;