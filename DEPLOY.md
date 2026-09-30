# DEPLOY.md — Deploy SIMORA ke Vercel

Panduan langkah demi langkah memindahkan **SIMORA (Sistem Monitoring Rapat dan Ruangan Kampus)** dari source code ke production di Vercel. Seluruh UI berbahasa Indonesia dan seluruh waktu memakai zona **Asia/Makassar (WITA)**.

---

## 1. Yang kamu butuhkan

- Akun GitHub
- Akun Vercel (bisa login dengan GitHub)
- Database PostgreSQL. Pilih salah satu:
  - **Neon** (https://neon.tech) — gratis, mudah, direkomendasikan
  - **Vercel Postgres** (via menu Storage di dashboard Vercel)

---

## 2. Siapkan database

### Opsi A — Neon (disarankan)
1. Buat akun di https://neon.tech → **Create Project**.
2. Setelah project jadi, buka **Connection Details**, salin **Connection String** (diawali `postgresql://...`).
3. Simpan string ini — dipakai sebagai `DATABASE_URL`.

### Opsi B — Vercel Postgres
1. Di dashboard Vercel, buka tab **Storage** → **Create Database** → pilih **Postgres**.
2. Setelah jadi, buka database → tab **.env.local**, salin nilai `POSTGRES_PRISMA_URL` (atau `DATABASE_URL`).

> Catatan: connection string Neon/Vercel Postgres umumnya sudah menyertakan `?sslmode=require`.

---

## 3. Push source ke GitHub

```bash
cd simora-vercel
git init
git add .
git commit -m "SIMORA siap deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/simora.git
git push -u origin main
```

> Jangan commit file `.env` (sudah ada di `.gitignore`). Secret hanya diisi di Vercel.

---

## 4. Import project di Vercel

1. Buka https://vercel.com → **Add New…** → **Project**.
2. Pilih repository `simora` → **Import**.
3. Framework Preset otomatis terdeteksi **Next.js** — biarkan default.
4. Buka bagian **Environment Variables**, isi:
   - `DATABASE_URL` = connection string dari langkah 2
   - `SESSION_SECRET` = string acak minimal 32 karakter. Buat dengan:
     ```bash
     openssl rand -base64 32
     ```
5. Klik **Deploy**.

---

## 5. Migrasi database (membuat tabel)

Setelah deploy pertama selesai, tabel database belum ada. Jalankan migrasi sekali saja.

**Cara termudah — dari Vercel CLI:**
```bash
npm i -g vercel
vercel link          # hubungkan ke project yang sudah di-deploy
vercel env pull .env.production.local
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2- | tr -d '"') npx prisma migrate deploy
```

**Alternatif — dari komputer sendiri:**
```bash
# isi DATABASE_URL di .env dengan connection string production
npx prisma migrate deploy
```

Jika berhasil, tabel `User`, `Room`, `Booking`, `Maintenance`, `Notification`, `AuditLog`, dan `Setting` sudah terbentuk.

---

## 6. Aktivasi admin pertama

1. Buka URL Vercel kamu, tambahkan `/bootstrap`, contoh: `https://simora.vercel.app/bootstrap`.
2. Isi nama, username, password (min. 8 karakter), dan pengaturan operasional.
3. Klik **Aktifkan Admin** → kamu diarahkan ke halaman login.
4. Login, lalu input data ruangan di menu **Ruangan**.

> Halaman `/bootstrap` otomatis tidak bisa dipakai lagi setelah admin pertama dibuat.

---

## 7. Menjalankan lokal (opsional)

```bash
cp .env.example .env
# isi DATABASE_URL (Postgres lokal / Neon) dan SESSION_SECRET di .env

npm install
npx prisma migrate deploy   # atau: npx prisma db push (untuk coba-coba)
npm run dev
```

Buka http://localhost:3000 → `/bootstrap` untuk aktivasi admin pertama.

---

## 8. Update / deploy ulang

Setiap `git push` ke branch `main` memicu deploy otomatis di Vercel. Jika skema Prisma berubah:

```bash
npx prisma migrate dev --name nama_perubahan   # lokal, membuat file migrasi
git add prisma/migrations && git commit -m "migrasi" && git push
# lalu di production:
npx prisma migrate deploy
```

---

## 9. Troubleshooting

| Gejala | Solusi |
|---|---|
| `SESSION_SECRET belum diisi` | Isi Environment Variable `SESSION_SECRET` di Vercel → **Redeploy** |
| Error koneksi database | Pastikan `DATABASE_URL` benar & database bisa diakses publik (Neon: aktifkan "public access") |
| Halaman hanya loading | Cek **Deployments → Logs** di Vercel untuk pesan error |
| Lupa password admin | Buat user admin baru tidak bisa via UI tanpa login. Reset manual: buat hash via `node -e "console.log(require('bcryptjs').hashSync('password-baru',10))"` lalu update kolom `password` user di database |

---

## Ringkasan environment variables

| Variable | Wajib | Contoh |
|---|---|---|
| `DATABASE_URL` | Ya | `postgresql://user:pass@host:5432/simora?sslmode=require` |
| `SESSION_SECRET` | Ya | string acak ≥ 32 karakter |

Selesai. Aplikasi berjalan privat (butuh login) — tidak ada link publik seperti artifact statis.
