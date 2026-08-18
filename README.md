# Doit4Me

Create a complete, modern, full-stack Web Application prototype called "DoIt4Me" — a hyperlocal task and service marketplace platform connecting Job Posters (Individual Clients, Government Pemda, BUMN, CSR Enterprises) and Service Providers (Workers/Freelancers).



### 1. DESIGN SYSTEM & VISUAL BRANDING

- **App Name:** DoIt4Me

- **Theme:** Clean, modern, mobile-first responsive layout (Tailwind CSS).

- **Color Palette:** Background Off-White (#F8FAFC), Primary Accent Trust Blue (#2563EB), Action Buttons Emerald Green (#10B981), Urgent Badges Red (#EF4444).

- **UI Feel:** Lightweight, soft card shadows, 12px rounded corners, and Lucide SVG icons. High accessibility for all user levels.



### 2. MULTI-LANGUAGE SUPPORT (i18n)

- Header language selector dropdown with national flags:

  - 🇮🇩 Bahasa Indonesia (Default)

  - 🇬🇧 English

  - 🇹🇷 Türkçe

  - 🇸🇦 العربية (Support RTL layout adjustment)



### 3. AUTHENTICATION & ONBOARDING

- **Hybrid Login:** Google Social Login (One-Tap) + Phone/WhatsApp OTP option.

- Allow Client registration to select "Individual Client" or "Institutional / Enterprise (Pemda, BUMN, CSR)".

- Require Workers to verify a valid WhatsApp Phone Number in profile settings before applying for jobs.

- **Guest Exploration Mode:** Unauthenticated users can explore the job feed, search workers, and preview forms. Trigger login modal ONLY when performing active actions (Publish Job, Apply/Comment, Lock Worker, Direct Hire).

- Landing page features two main action pathways:

  1. "Butuh Bantuan? Ayo cari pekerja sekitar..." -> Opens Job Creation Form.

  2. "Butuh Kerja Instan? Yuk eksplorasi pekerjaan..." -> Opens Job Feed.



### 4. DYNAMIC JOB CREATION FLOW (CLIENT SIDE)

Multi-step job posting form:

- **Title, Description, & Requirements:** Input job title, scope, optional photo attachments.

- **Location Selector:**

  - *Di Lokasi Saya (On-Site)* (Uses GPS / Location Map).

  - *Bebas Lokasi (Remote)* (Online tasks like design, printing, documentation).

- **Time/Execution Selector:**

  - *Kerja Sekarang (Urgent)* (Adds high priority red badge).

  - *Kerja Terikat Jadwal (Event/Scheduled)* (Requires Expiration Date & Time picker).

  - *Fleksibel (Kapan Saja)*.

- **Payment Structure:** Amount input + Dropdown selection (Selesai Kerja, Harian, Borongan, Mingguan).



### 5. SMART JOB FEED & EXPLORATION (WORKER SIDE)

- Dynamic Feed displaying available jobs sorted by: `Match Skill + Nearest GPS Distance`.

- Filter Tabs: `[Rekomendasi Skill]` | `[Terdekat]` | `[Terbaru]` | `[Bebas Lokasi/Remote]` | `[Program Pemda & CSR]`.

- Special UI for Institutional Jobs (Pemda/CSR): Highlighted border, badge `[Padat Karya]` or `[CSR Official]`, and headcount quota requirements (e.g., "Dibutuhkan 10 Pekerja").



### 6. CORE INTERACTION: BIDDING, LOCK WORKER & ESCROW

- **Public Comment Section:** Workers submit proposals/bids under job posts.

- **Applicant Review:** Client views worker summary cards (Photo, Verified KTP Badge, Star Rating, Skills).

- **"Kunci & Pilih Pekerja" Action:**

  - Locks job status to `IN_PROGRESS` and closes public comments.

  - Hides Client's exact phone number and precise address until worker is locked.

  - Simulates Secure Escrow Payment modal (Hold funds until completion).

  - Opens private In-App Chat room between Client and locked Worker.

- **Completion & Verification:**

  - Requires Worker to upload "Before" and "After" work photos.

  - Client confirms job done -> Escrow releases payment -> Prompts 1-5 Star Rating & Review (Strictly tied to Client's verified name, NO ANONYMOUS REVIEWS).



### 7. DIRECT CHATBOX & DIRECT HIRE SYSTEM

- On Worker public profiles, provide primary CTA buttons: "Chat & Tanya" and "Tawarkan Proyek Langsung (Direct Hire)".

- Clicking "Chat & Tanya" opens a direct 1-on-1 private Chatbox drawer for inquiry discussions.

- Automated Masking: Auto-hide phone numbers, emails, or bank accounts in preliminary chats to prevent off-platform transactions.

- Include a "Send Direct Job Offer" action button inside the Chatbox UI prompting a quick checkout modal (Job Title, Agreed Budget, Escrow Payment).

- Include a central Messaging/Inbox page for users filtered by [Diskusi Inquiry] and [Proyek Aktif].



### 8. WORKER PROFILE & PROTECTED PORTFOLIO

- **Profile Header:** Avatar, Name, Verified Badge, Domisili, Average Rating (e.g., 4.9/5.0), and Total Jobs Completed.

- **Promotional Headline & Bio:** Worker's catchy statement and detailed service description.

- **Protected Portfolio Tabs (VIEW-ONLY):**

  - Tabs: [Foto Hasil Kerja], [Video Showreel/Demo], [Sertifikat & Lisensi Resmi].

  - Protection Rules: Disable right-click, hide download buttons, and render automatic semi-transparent watermark: "DOIT4ME PREVIEW ONLY".



### 9. OFFICIAL ENTERPRISE / INSTITUTIONAL PROFILE SYSTEM

- When an Institutional Client receives Official Badge approval, unlock the "Enterprise Profile Editor".

- Enterprise Profile Fields: Official Logo upload, Legal Entity Name, Bio/Mission statement, Official Website URL, Headquarter Address, and Official PIC Contact Info.

- Public Showcase Page: Displays official Gold/Blue Badge (`[🏛️ Pemda Official]` or `[🏢 Verified Enterprise/CSR]`), Social Impact Metrics (Total Projects, Workers Absorbed, Total Budget Disbursed), active job listings, and external website link.



### 10. MULTI-LEVEL ADMIN SYSTEM & ACCESS CONTROL (RBAC)

Support distinct Admin roles with specialized dashboards:

- **Super Admin (`/admin`):** Full system control, role permissions, and overall platform analytics.

- **Sub-Admin Content Moderation & Disputes (`/admin/moderation`):**

  - *Dispute Resolution Center:* View locked escrow transactions with active disputes, inspect chat history and before/after photos with actions: [Release to Worker] or [Refund to Client].

  - *Content & Report Queue:* Review flagged jobs/comments (Actions: Keep, Delete Post, Warn User, Suspend Account).

  - *Review Moderation:* Review reported 1-star ratings for hate speech or harassment.

- **Sub-Admin Finance (`/admin/finance`):**

  - *Withdrawal Approvals:* Queue of worker payout requests to bank/e-wallet accounts with [Approve Payout] and [Reject Payout] actions.

  - *Escrow & Commission Monitor:* Tracking active Escrow funds, platform commission earnings, and GMV report with CSV export.

  - *Institutional Invoicing:* Track budget deposits for Pemda and CSR Enterprise partners.

- **Sub-Admin Kemitraan & Afiliasi (`/admin/affiliates`):**

  - Review submitted legal verification documents (NIB, Official Letters) from institutional accounts.

  - Action buttons: [Approve & Assign Official Badge] or [Reject Verification].

  - Access Restriction: Moderation & Finance admins CANNOT assign official badges.

### 11. DATABASE ARCHITECTURE (SUPABASE INTEGRATION)

Create schema tables for: `users` (roles: client_individual, client_enterprise, worker, admin_super, admin_moderator, admin_finance, admin_affiliate), `skills`, `jobs`, `comments`, `direct_messages`, `transactions_escrow`, `withdrawals`, `reviews`, `portfolios`, `reports`, `enterprise_profiles`.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://doitfome.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd628cba-177b-4c6a-becd-b604fea14367).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
