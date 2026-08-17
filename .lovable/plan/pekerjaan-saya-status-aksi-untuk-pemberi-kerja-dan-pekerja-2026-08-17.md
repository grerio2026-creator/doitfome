# Pekerjaan Saya — status & aksi untuk pemberi kerja dan pekerja

Halaman baru `/my-jobs` ("Pekerjaan Saya") yang menampilkan semua pekerjaan milik pengguna beserta status, progres, dan aksi yang bisa dilakukan langsung dari satu tempat.

## Tab 1 — Pekerjaan yang saya posting

Kartu per pekerjaan dengan judul, nilai bayaran, nama pekerja yang dikunci, dan garis progres 4 langkah:

```text
Diposting  →  Pekerja dikunci  →  Hasil dikirim  →  Selesai & dibayar
   OPEN         IN_PROGRESS          SUBMITTED          COMPLETED
```

Aksi sesuai status:
- OPEN: jumlah penawaran masuk + tombol "Lihat penawaran" (ke halaman detail untuk mengunci pekerja).
- IN_PROGRESS: status "Sedang dikerjakan", tombol chat ke pekerja.
- SUBMITTED: foto sebelum/sesudah, beri bintang 1–5 + testimoni, lalu tombol **Selesai & Bayar** (melepas dana escrow ke pekerja, sama seperti alur di halaman detail).
- COMPLETED: label selesai, nilai bintang yang diberikan.
- Semua status: tombol **Laporkan** (masuk ke antrean moderasi) dan tombol ajukan sengketa bila hasil tidak sesuai.

## Tab 2 — Pekerjaan yang saya kerjakan

Untuk pengguna yang penawarannya diterima:
- Badge tercentang "Sedang menerima pekerjaan" di bagian atas bila ada pekerjaan aktif, plus hitungan pekerjaan aktif.
- Kartu per pekerjaan dengan garis progres yang sama, nama pemberi kerja, nilai bayaran, dan status escrow (dana ditahan / dilepas).
- IN_PROGRESS: isi tautan foto sebelum/sesudah lalu tombol **Selesai** (mengirim hasil kerja, status jadi SUBMITTED).
- SUBMITTED: label "Menunggu konfirmasi klien".
- COMPLETED: label selesai + dana dilepas, dan bintang yang diterima.
- Tombol chat dan Laporkan tersedia.

Tab 3 kecil: **Penawaran saya** — daftar pekerjaan yang sudah saya tawar tapi belum dikunci, supaya jelas mana yang masih menunggu.

## Titik masuk

- Menu profil di header: item "Pekerjaan Saya".
- Kartu ringkas di tab Profil pada halaman Akun: "x pekerjaan aktif" dengan tautan ke `/my-jobs`.
- Badge tercentang "Sedang mengerjakan pekerjaan" juga tampil di profil publik pekerja.

## Catatan teknis

- Route baru `src/routes/my-jobs.tsx` (halaman privat; menampilkan CTA masuk bila belum login), dengan head metadata sendiri.
- Query baru di `src/lib/queries.ts`: `fetchJobsByClient(userId)`, `fetchJobsByWorker(userId)` (filter `locked_worker_id`), `fetchMyBids(userId)` (komentar dengan `bid_amount` milik saya + join pekerjaan), dan `fetchActiveWorkCount(userId)`.
- Aksi memakai tabel yang sudah ada lewat client Supabase, mengikuti pola di `src/routes/jobs.$jobId.tsx`: update `jobs.status`, update `transactions_escrow.status` ke RELEASED, insert `reviews`, insert `reports` (memakai `ReportButton` yang sudah ada). Tidak ada perubahan skema database.
- Komponen bersama `src/components/JobProgress.tsx` untuk garis progres agar dipakai di kedua tab.
