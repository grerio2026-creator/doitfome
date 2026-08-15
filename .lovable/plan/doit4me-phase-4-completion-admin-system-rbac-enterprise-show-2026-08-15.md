# DoIt4Me — Phase 4 completion: admin system, RBAC, enterprise showcase

Phases 1–3 are on disk (landing, job feed, job detail lifecycle, post-job, worker directory + profile, inbox, account). What remains is the admin system as separate role-scoped pages with server-side enforcement, plus the enterprise surfaces.

## 1. Server-side role enforcement

Today the admin console writes directly from the browser (reports, escrow, withdrawals, badge status), so any signed-in admin role can perform any admin action. Replace those writes with authenticated server functions that check the caller's specific role before acting:

- Moderation actions (resolve/dismiss report, hide comment, unflag review) — moderator or super admin.
- Finance actions (approve/reject withdrawal, release/refund disputed escrow) — finance or super admin.
- Badge approval/rejection on institutional partners — affiliate or super admin only. Moderation and finance roles must be rejected.
- Role grant/revoke in user management — super admin only.

## 2. Admin pages split by role

- `/admin` — Super admin overview: platform counts (users, jobs by status, GMV, commission), plus user + role management (search a user, grant or revoke a role).
- `/admin/moderation` — Dispute center showing the job's before/after photos and chat history alongside Release to Worker / Refund to Client; report queue with Keep, Delete, Warn, Suspend; review moderation queue for flagged/1-star reviews.
- `/admin/finance` — Withdrawal approval queue, escrow/commission/GMV monitor with CSV export, institutional budget deposit entry.
- `/admin/affiliates` — Legal document review (NIB, official letter link) with Approve & Assign Official Badge / Reject.

Each page shows an access-denied state when the signed-in user lacks the matching role, and a nav strip linking the four consoles for users who hold several roles. All admin routes stay `noindex`.

## 3. Enterprise surfaces

- `/enterprise/$ownerId` — public showcase: logo, legal name, Pemda/Enterprise badge, mission, impact metrics (workers absorbed, total budget, total projects), active jobs list, website link. Full head metadata for sharing.
- Enterprise profile editor in `/account`, unlocked only after badge approval, plus a submission form (legal name, document link, PIC) for pending partners so the affiliate queue has real entries.

## 4. Reporting entry points

Add a "Laporkan" action on job detail comments, worker reviews, and chat messages so the moderation queue is reachable from the product, writing to the existing reports table.

## Technical notes

- New server functions live in `src/lib/admin.functions.ts` with `requireSupabaseAuth`, verifying the role through `has_role` on the authenticated client before any write; no service-role client needed since RLS already scopes finance/affiliate updates.
- Current RLS lets any admin role update reports and escrow (`is_admin`); tighten those policies to the role that owns each action via a migration, matching the server-function checks.
- `/admin` becomes a layout route rendering `<Outlet />` with the overview at `src/routes/admin.index.tsx`, and the three consoles as sibling files.
- Enterprise showcase reads through a public fetcher (public read policy already exists on `enterprise_profiles` and `jobs`).
