# PintuMedia

Fondasi platform streaming responsif dengan katalog multi-platform, lima episode gratis, paywall, dan program affiliate.

## Yang sudah tersedia

- tampilan katalog mobile dan desktop dengan pemilih 56 platform;
- lima episode pertama terbuka;
- episode 6–10 memunculkan paywall;
- pilihan paket mingguan, bulanan, dan unlock per serial;
- dashboard affiliate dengan link referral dan simulasi komisi;
- pencarian, login demo, dan navigasi seluler;
- fondasi Next.js App Router untuk aplikasi produksi;
- skema PostgreSQL Supabase, RLS, entitlement, dan komisi idempoten;
- checkout server dan webhook untuk Midtrans Snap atau Xendit Payment Sessions;
- catatan penggunaan konten berlisensi.

## Menjalankan demo Next.js

Jalankan `npm install`, lalu `npm run dev`. Tanpa kredensial pembayaran, katalog dan pratinjau QRIS tetap dapat diuji, tetapi episode premium tidak akan terbuka otomatis.

## Deploy di Niagahoster/Hostinger

Pilih **Web Apps → Buat website → Impor repository GitHub**, lalu gunakan repository `https://github.com/reyhanzhan/pintumedia` dan branch `main`. Pilih Node.js 22; build command `npm run build`; start command `npm run start`. Aplikasi tetap menampilkan katalog pratinjau jika variabel Supabase dan gateway pembayaran belum diisi.

## Mengaktifkan Supabase dan pembayaran

1. Salin `.env.example` menjadi `.env.local` dan isi kredensial.
2. Jalankan migrasi `supabase/migrations/202609220001_pintumedia.sql` pada proyek Supabase.
3. Isi salah satu konfigurasi gateway pembayaran di `.env.local`.

Pilih satu gateway lewat `PAYMENT_PROVIDER=midtrans` atau `PAYMENT_PROVIDER=xendit`. Gunakan sandbox sampai seluruh alur webhook teruji. Endpoint `POST /api/checkout` membuat sesi pembayaran; webhook gateway memverifikasi pembayaran dan database mengaktifkan akses sekaligus menghitung komisi 20% secara idempoten.

Jangan pernah menaruh service-role key Supabase, Midtrans server key, atau Xendit secret key di browser maupun GitHub.

Jangan mengunggah atau menayangkan film, serial, poster, musik, atau subtitle tanpa izin pemegang hak.
