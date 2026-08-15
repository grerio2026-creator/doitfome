# DoIt4Me — Hyperlocal Task & Service Marketplace

A full-stack prototype connecting job posters (individuals, Pemda, BUMN, CSR enterprises) with local workers, including bidding, worker locking, simulated escrow, chat, portfolios, and a multi-level admin system.

Because the scope is large, this is built in four phases. Each phase ends with a working, clickable app so you can review as it grows.

## Design system

- Off-white background (#F8FAFC), Trust Blue primary (#2563EB), Emerald action buttons (#10B981), Red urgent badges (#EF4444) — all as semantic theme tokens.
- Mobile-first, soft card shadows, 12px radius, Lucide icons, generous tap targets.
- Language selector in the header: Bahasa Indonesia (default), English, Türkçe, العربية with RTL layout flip. Translation strings live in one dictionary per language; UI reads from a language context persisted locally.

## Phase 1 — Foundation, public surfaces, backend

- Enable Lovable Cloud (database, auth, storage).
- Database tables: `profiles` (role: client_individual, client_enterprise, worker), `user_roles` (separate table for admin_super, admin_moderator, admin_finance, admin_affiliate), `skills`, `worker_skills`, `jobs`, `comments`, `direct_messages`, `conversations`, `transactions_escrow`, `withdrawals`, `reviews`, `portfolios`, `reports`, `enterprise_profiles`. RLS on every table, plus demo seed data so the feed and profiles look alive immediately.
- Landing page with the two pathways: "Butuh Bantuan? Ayo cari pekerja sekitar…" → job creation, and "Butuh Kerja Instan? Yuk eksplorasi pekerjaan…" → job feed.
- Guest exploration: feed, worker search, and forms are browsable without login; a login modal appears only on active actions (publish, apply/comment, lock worker, direct hire).
- Auth: Google one-tap sign-in plus phone/WhatsApp OTP; registration chooses Individual or Institutional/Enterprise. Workers must verify a WhatsApp number before applying.

## Phase 2 — Jobs, feed, bidding, escrow lifecycle

- Multi-step job creation: title/description/requirements with photo upload; location mode (On-Site with map/GPS pin, or Remote); timing (Urgent with red badge, Scheduled with expiry date/time, Flexible); payment amount + type (Selesai Kerja, Harian, Borongan, Mingguan).
- Job feed sorted by skill match + nearest distance, with filter tabs: Rekomendasi Skill, Terdekat, Terbaru, Bebas Lokasi, Program Pemda & CSR. Institutional jobs get highlighted borders, `Padat Karya` / `CSR Official` badges, and headcount quotas.
- Job detail with public comment/bid thread, applicant cards (photo, verified KTP badge, rating, skills).
- "Kunci & Pilih Pekerja": sets job IN_PROGRESS, closes comments, reveals the client's exact phone/address only to the locked worker, opens the escrow hold modal and a private chat room.
- Completion: worker uploads Before/After photos, client confirms, escrow releases, then a mandatory named 1–5 star review (no anonymous reviews).

## Phase 3 — Chat, direct hire, profiles

- Worker public profile: avatar, name, verified badge, domisili, average rating, jobs completed, promo headline and bio, with "Chat & Tanya" and "Tawarkan Proyek Langsung" CTAs.
- Chat drawer with automatic masking of phone numbers, emails and bank accounts in pre-lock conversations, plus a "Send Direct Job Offer" action opening a quick checkout modal (title, budget, escrow).
- Inbox page filtered by Diskusi Inquiry and Proyek Aktif.
- Protected portfolio tabs (Foto Hasil Kerja, Video Showreel, Sertifikat & Lisensi): view-only, right-click disabled, no download controls, semi-transparent "DOIT4ME PREVIEW ONLY" watermark.
- Enterprise profile editor unlocked after badge approval (logo, legal name, mission, website, HQ address, PIC contact) and a public showcase page with Pemda/Enterprise badge, impact metrics, active jobs, and website link.

## Phase 4 — Admin system (RBAC)

- `/admin` Super Admin: platform analytics, user and role management.
- `/admin/moderation`: dispute center (chat history + before/after photos, Release to Worker / Refund to Client), report queue (Keep, Delete, Warn, Suspend), review moderation for reported 1-star ratings.
- `/admin/finance`: withdrawal approval queue, escrow/commission/GMV monitor with CSV export, institutional invoicing and budget deposits.
- `/admin/affiliates`: legal document review (NIB, official letters) with Approve & Assign Official Badge / Reject.
- Access control enforced server-side: only the affiliate admin role can assign official badges; moderation and finance roles cannot.

## Technical notes

- TanStack Start routes with file-based routing; each public page gets its own route and metadata.
- Data access through server functions with the authenticated Supabase client; roles checked via a security-definer `has_role` function against the separate `user_roles` table (never a column on profiles).
- Escrow, payouts and OTP-based payment steps are simulated (state machine + UI), not connected to a real payment provider.
- File uploads (job photos, before/after, portfolio, logos, legal docs) use Cloud storage buckets with per-user access policies.
- Maps/GPS use browser geolocation and a lightweight static map preview; no external map SDK.
