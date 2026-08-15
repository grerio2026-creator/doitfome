
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin_super','admin_moderator','admin_finance','admin_affiliate');
CREATE TYPE public.user_kind AS ENUM ('client_individual','client_enterprise','worker');
CREATE TYPE public.job_status AS ENUM ('OPEN','IN_PROGRESS','SUBMITTED','COMPLETED','CANCELLED','DISPUTED');
CREATE TYPE public.location_mode AS ENUM ('onsite','remote');
CREATE TYPE public.timing_mode AS ENUM ('urgent','scheduled','flexible');
CREATE TYPE public.payment_type AS ENUM ('selesai_kerja','harian','borongan','mingguan');
CREATE TYPE public.escrow_status AS ENUM ('HELD','RELEASED','REFUNDED','DISPUTED');

-- PROFILES (public-safe columns only)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT 'Pengguna',
  avatar_url text,
  kind public.user_kind NOT NULL DEFAULT 'client_individual',
  domisili text,
  headline text,
  bio text,
  rating numeric(2,1) NOT NULL DEFAULT 0,
  jobs_completed int NOT NULL DEFAULT 0,
  ktp_verified boolean NOT NULL DEFAULT false,
  whatsapp_verified boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PRIVATE CONTACTS
CREATE TABLE public.profile_contacts (
  user_id uuid PRIMARY KEY,
  phone text,
  whatsapp text,
  exact_address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts owner all" ON public.profile_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin_super'));

-- SKILLS
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text
);
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills public read" ON public.skills FOR SELECT USING (true);

CREATE TABLE public.worker_skills (
  worker_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, skill_id)
);
GRANT SELECT ON public.worker_skills TO anon;
GRANT SELECT, INSERT, DELETE ON public.worker_skills TO authenticated;
GRANT ALL ON public.worker_skills TO service_role;
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_skills public read" ON public.worker_skills FOR SELECT USING (true);
CREATE POLICY "worker_skills self write" ON public.worker_skills FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "worker_skills self delete" ON public.worker_skills FOR DELETE TO authenticated USING (auth.uid() = worker_id);

-- ENTERPRISE PROFILES
CREATE TABLE public.enterprise_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  legal_name text NOT NULL,
  logo_url text,
  mission text,
  website text,
  hq_address text,
  pic_name text,
  pic_contact text,
  badge_kind text NOT NULL DEFAULT 'enterprise',
  badge_status text NOT NULL DEFAULT 'pending',
  legal_doc_url text,
  workers_absorbed int NOT NULL DEFAULT 0,
  total_budget bigint NOT NULL DEFAULT 0,
  total_projects int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.enterprise_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.enterprise_profiles TO authenticated;
GRANT ALL ON public.enterprise_profiles TO service_role;
ALTER TABLE public.enterprise_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enterprise public read" ON public.enterprise_profiles FOR SELECT USING (true);
CREATE POLICY "enterprise owner insert" ON public.enterprise_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "enterprise owner update" ON public.enterprise_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin_affiliate') OR public.has_role(auth.uid(),'admin_super'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin_affiliate') OR public.has_role(auth.uid(),'admin_super'));

-- JOBS
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  photos text[] NOT NULL DEFAULT '{}',
  location_mode public.location_mode NOT NULL DEFAULT 'onsite',
  area_label text,
  lat double precision,
  lng double precision,
  timing_mode public.timing_mode NOT NULL DEFAULT 'flexible',
  expires_at timestamptz,
  payment_amount bigint NOT NULL DEFAULT 0,
  payment_type public.payment_type NOT NULL DEFAULT 'selesai_kerja',
  status public.job_status NOT NULL DEFAULT 'OPEN',
  locked_worker_id uuid,
  is_institutional boolean NOT NULL DEFAULT false,
  institution_kind text,
  headcount int NOT NULL DEFAULT 1,
  skill_id uuid REFERENCES public.skills(id),
  before_photo text,
  after_photo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs public read" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs client insert" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "jobs participants update" ON public.jobs FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = locked_worker_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = client_id OR auth.uid() = locked_worker_id OR public.is_admin(auth.uid()));

CREATE TABLE public.job_private_details (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  exact_address text,
  contact_phone text
);
GRANT SELECT, INSERT, UPDATE ON public.job_private_details TO authenticated;
GRANT ALL ON public.job_private_details TO service_role;
ALTER TABLE public.job_private_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job private read" ON public.job_private_details FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.locked_worker_id = auth.uid() OR public.is_admin(auth.uid())))
);
CREATE POLICY "job private write" ON public.job_private_details FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid())
);
CREATE POLICY "job private update" ON public.job_private_details FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid())
);

-- COMMENTS / BIDS
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  bid_amount bigint,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments self insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments moderate" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "comments delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- CONVERSATIONS + MESSAGES
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'inquiry',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, worker_id, job_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations participants" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (client_id, worker_id) OR public.is_admin(auth.uid()));
CREATE POLICY "conversations create" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (client_id, worker_id));
CREATE POLICY "conversations update" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (client_id, worker_id));

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages participants read" ON public.direct_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() IN (c.client_id, c.worker_id) OR public.is_admin(auth.uid())))
);
CREATE POLICY "messages send" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.client_id, c.worker_id))
);

-- ESCROW
CREATE TABLE public.transactions_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  amount bigint NOT NULL,
  commission bigint NOT NULL DEFAULT 0,
  status public.escrow_status NOT NULL DEFAULT 'HELD',
  dispute_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions_escrow TO authenticated;
GRANT ALL ON public.transactions_escrow TO service_role;
ALTER TABLE public.transactions_escrow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow participants read" ON public.transactions_escrow FOR SELECT TO authenticated
  USING (auth.uid() IN (client_id, worker_id) OR public.is_admin(auth.uid()));
CREATE POLICY "escrow create" ON public.transactions_escrow FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "escrow update" ON public.transactions_escrow FOR UPDATE TO authenticated
  USING (auth.uid() IN (client_id, worker_id) OR public.is_admin(auth.uid()));

-- WITHDRAWALS
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  amount bigint NOT NULL,
  method text NOT NULL DEFAULT 'bank',
  account_ref text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals owner read" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = worker_id OR public.has_role(auth.uid(),'admin_finance') OR public.has_role(auth.uid(),'admin_super'));
CREATE POLICY "withdrawals owner create" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "withdrawals finance update" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin_finance') OR public.has_role(auth.uid(),'admin_super'));

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  worker_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews create" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews moderate" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id OR public.is_admin(auth.uid()));

-- PORTFOLIOS
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'photo',
  title text NOT NULL,
  media_url text,
  issuer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolios public read" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "portfolios owner write" ON public.portfolios FOR ALL TO authenticated USING (auth.uid() = worker_id) WITH CHECK (auth.uid() = worker_id);

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  target_preview text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports owner or admin read" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));
CREATE POLICY "reports create" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports admin update" ON public.reports FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, kind)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,'pengguna'),'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'kind')::public.user_kind, 'client_individual')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DEMO DATA
INSERT INTO public.skills (id, name, icon) VALUES
 ('11111111-1111-4111-8111-000000000001','Tukang Bangunan','hammer'),
 ('11111111-1111-4111-8111-000000000002','Kebersihan','sparkles'),
 ('11111111-1111-4111-8111-000000000003','Desain Grafis','palette'),
 ('11111111-1111-4111-8111-000000000004','Kurir & Antar','bike'),
 ('11111111-1111-4111-8111-000000000005','Elektronik & Listrik','plug'),
 ('11111111-1111-4111-8111-000000000006','Dokumentasi & Foto','camera');

INSERT INTO public.profiles (id, full_name, avatar_url, kind, domisili, headline, bio, rating, jobs_completed, ktp_verified, whatsapp_verified, lat, lng) VALUES
 ('22222222-2222-4222-8222-000000000001','Budi Santoso','https://i.pravatar.cc/200?img=12','worker','Bandung Kulon','Tukang bangunan siap panggil 24 jam','Berpengalaman 12 tahun renovasi rumah, plester, cat, dan atap bocor.',4.9,132,true,true,-6.9175,107.6191),
 ('22222222-2222-4222-8222-000000000002','Siti Rahma','https://i.pravatar.cc/200?img=45','worker','Cimahi','Bersih-bersih rumah & kantor kilat','Jasa deep cleaning harian dan borongan, alat lengkap dibawa sendiri.',4.8,89,true,true,-6.8721,107.5420),
 ('22222222-2222-4222-8222-000000000003','Rangga Pratama','https://i.pravatar.cc/200?img=33','worker','Remote / Jakarta','Desainer grafis & cetak spanduk','Desain feed, banner, spanduk, dan cetak dokumen kegiatan pemerintahan.',4.7,54,true,true,-6.2088,106.8456),
 ('22222222-2222-4222-8222-000000000004','Dewi Lestari','https://i.pravatar.cc/200?img=48','worker','Bandung Wetan','Fotografer dokumentasi acara','Dokumentasi kegiatan CSR, seminar, dan acara pemda.',5.0,41,true,true,-6.9034,107.6270),
 ('33333333-3333-4333-8333-000000000001','Andi Wijaya','https://i.pravatar.cc/200?img=15','client_individual','Bandung',NULL,NULL,0,0,true,true,-6.9147,107.6098),
 ('33333333-3333-4333-8333-000000000002','Dinas Tenaga Kerja Kota Bandung','https://i.pravatar.cc/200?img=68','client_enterprise','Kota Bandung','Program Padat Karya 2026','Menyerap tenaga kerja lokal melalui program padat karya.',0,0,true,true,-6.9218,107.6070),
 ('33333333-3333-4333-8333-000000000003','PT Nusantara Energi (CSR)','https://i.pravatar.cc/200?img=57','client_enterprise','Jakarta Selatan','CSR Bersih Sungai & UMKM','Program tanggung jawab sosial perusahaan bidang lingkungan.',0,0,true,true,-6.2615,106.8106);

INSERT INTO public.worker_skills (worker_id, skill_id) VALUES
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001'),
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000005'),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002'),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000003'),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000006');

INSERT INTO public.enterprise_profiles (owner_id, legal_name, logo_url, mission, website, hq_address, pic_name, pic_contact, badge_kind, badge_status, workers_absorbed, total_budget, total_projects) VALUES
 ('33333333-3333-4333-8333-000000000002','Dinas Tenaga Kerja Kota Bandung','https://i.pravatar.cc/200?img=68','Menurunkan angka pengangguran melalui program padat karya berbasis kelurahan.','https://bandung.go.id','Jl. Wastukancana No. 2, Bandung','Hendra Kusuma','pic.disnaker@bandung.go.id','pemda','approved',320,1450000000,18),
 ('33333333-3333-4333-8333-000000000003','PT Nusantara Energi','https://i.pravatar.cc/200?img=57','Menjalankan program CSR lingkungan dan pemberdayaan UMKM.','https://nusantaraenergi.co.id','SCBD Lot 9, Jakarta Selatan','Maya Anggraini','csr@nusantaraenergi.co.id','csr','approved',150,780000000,11);

INSERT INTO public.jobs (id, client_id, title, description, requirements, location_mode, area_label, lat, lng, timing_mode, expires_at, payment_amount, payment_type, status, is_institutional, institution_kind, headcount, skill_id) VALUES
 ('44444444-4444-4444-8444-000000000001','33333333-3333-4333-8333-000000000001','Perbaiki atap bocor rumah 2 lantai','Atap bagian belakang bocor saat hujan deras, butuh penambalan dan cek talang.','Bawa alat sendiri, pengalaman min 2 tahun','onsite','Sukajadi, Bandung',-6.8915,107.5900,'urgent',NULL,850000,'selesai_kerja','OPEN',false,NULL,1,'11111111-1111-4111-8111-000000000001'),
 ('44444444-4444-4444-8444-000000000002','33333333-3333-4333-8333-000000000001','Bersih-bersih kos 10 kamar','Deep cleaning kamar mandi, lantai, dan jendela.','Sanggup 2 hari kerja','onsite','Coblong, Bandung',-6.8890,107.6130,'scheduled','2026-09-01 09:00:00+07',1200000,'borongan','OPEN',false,NULL,2,'11111111-1111-4111-8111-000000000002'),
 ('44444444-4444-4444-8444-000000000003','33333333-3333-4333-8333-000000000003','Desain 12 konten kampanye CSR','Butuh desain feed Instagram dan spanduk kegiatan bersih sungai.','Portofolio desain wajib dilampirkan','remote','Bebas Lokasi',NULL,NULL,'flexible',NULL,3500000,'borongan','OPEN',true,'csr',1,'11111111-1111-4111-8111-000000000003'),
 ('44444444-4444-4444-8444-000000000004','33333333-3333-4333-8333-000000000002','Padat Karya: Pembersihan Saluran Air Kelurahan','Program padat karya pembersihan drainase 3 kelurahan selama 5 hari kerja.','KTP domisili Kota Bandung, sehat jasmani','onsite','Kelurahan Cibadak, Bandung',-6.9270,107.5900,'scheduled','2026-08-28 07:00:00+07',150000,'harian','OPEN',true,'pemda',10,'11111111-1111-4111-8111-000000000002'),
 ('44444444-4444-4444-8444-000000000005','33333333-3333-4333-8333-000000000002','Dokumentasi Foto Kegiatan Pelatihan Kerja','Dokumentasi 1 hari kegiatan pelatihan, hasil edit dikirim H+2.','Kamera mirrorless/DSLR sendiri','onsite','Jl. Wastukancana, Bandung',-6.9130,107.6070,'urgent',NULL,900000,'selesai_kerja','OPEN',true,'pemda',2,'11111111-1111-4111-8111-000000000006');

INSERT INTO public.job_private_details (job_id, exact_address, contact_phone) VALUES
 ('44444444-4444-4444-8444-000000000001','Jl. Sukagalih No. 88, Sukajadi, Bandung','+62 812-1111-2222'),
 ('44444444-4444-4444-8444-000000000002','Jl. Dipati Ukur No. 12, Coblong, Bandung','+62 812-1111-2222');

INSERT INTO public.comments (job_id, user_id, body, bid_amount) VALUES
 ('44444444-4444-4444-8444-000000000001','22222222-2222-4222-8222-000000000001','Siap pak, saya bisa datang sore ini. Sudah biasa tambal atap galvalum.',800000),
 ('44444444-4444-4444-8444-000000000002','22222222-2222-4222-8222-000000000002','Bisa saya kerjakan 2 hari dengan 1 asisten, alat lengkap.',1150000),
 ('44444444-4444-4444-8444-000000000003','22222222-2222-4222-8222-000000000003','Portofolio saya ada di profil, siap revisi 2x per desain.',3300000);

INSERT INTO public.reviews (job_id, reviewer_id, reviewer_name, worker_id, rating, comment) VALUES
 (NULL,'33333333-3333-4333-8333-000000000001','Andi Wijaya','22222222-2222-4222-8222-000000000001',5,'Kerja rapi, atap tidak bocor lagi. Datang tepat waktu.'),
 (NULL,'33333333-3333-4333-8333-000000000001','Andi Wijaya','22222222-2222-4222-8222-000000000002',5,'Bersih banget, kamar mandi kinclong.'),
 (NULL,'33333333-3333-4333-8333-000000000003','PT Nusantara Energi (CSR)','22222222-2222-4222-8222-000000000003',4,'Desain bagus, revisi cepat.');

INSERT INTO public.portfolios (worker_id, kind, title, media_url, issuer) VALUES
 ('22222222-2222-4222-8222-000000000001','photo','Renovasi dapur Sukajadi','https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',NULL),
 ('22222222-2222-4222-8222-000000000001','photo','Perbaikan atap perumahan','https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',NULL),
 ('22222222-2222-4222-8222-000000000001','certificate','Sertifikat Keselamatan Kerja (K3)',NULL,'BNSP'),
 ('22222222-2222-4222-8222-000000000002','photo','Deep cleaning kantor','https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',NULL),
 ('22222222-2222-4222-8222-000000000003','photo','Kampanye visual UMKM','https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800',NULL),
 ('22222222-2222-4222-8222-000000000003','video','Showreel motion 2025','https://www.w3schools.com/html/mov_bbb.mp4',NULL),
 ('22222222-2222-4222-8222-000000000004','photo','Dokumentasi seminar CSR','https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',NULL);

INSERT INTO public.transactions_escrow (job_id, client_id, worker_id, amount, commission, status) VALUES
 ('44444444-4444-4444-8444-000000000001','33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000001',800000,40000,'HELD'),
 ('44444444-4444-4444-8444-000000000003','33333333-3333-4333-8333-000000000003','22222222-2222-4222-8222-000000000003',3300000,165000,'DISPUTED');

INSERT INTO public.withdrawals (worker_id, amount, method, account_ref, status) VALUES
 ('22222222-2222-4222-8222-000000000001',1500000,'bank','BCA •••• 4412','pending'),
 ('22222222-2222-4222-8222-000000000002',750000,'ewallet','GoPay •••• 8890','pending'),
 ('22222222-2222-4222-8222-000000000003',2000000,'bank','Mandiri •••• 2231','approved');
