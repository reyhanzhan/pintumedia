# PintuMedia

Fondasi platform streaming responsif dengan katalog multi-platform, lima episode gratis, paywall, dan program affiliate.

## Yang sudah tersedia

- tampilan katalog mobile dan desktop dengan pemilih 56 platform;
- lima episode pertama terbuka;
- episode 6–10 memunculkan paywall;
- pilihan paket mingguan, bulanan, dan unlock per serial;
- aktivasi akses demo untuk menguji alur;
- dashboard affiliate dengan link referral dan simulasi komisi;
- pencarian, login demo, dan navigasi seluler;
- fondasi Next.js App Router untuk aplikasi produksi;
- skema PostgreSQL Supabase, RLS, entitlement, dan komisi idempoten;
- checkout server dan webhook untuk Midtrans Snap atau Xendit Payment Sessions;
- catatan penggunaan konten berlisensi.

## Menjalankan demo cepat

Buka `dist/index.html` melalui server web statis. Versi ini tidak melakukan transaksi nyata.

## Menjalankan Next.js + Supabase

1. Salin `.env.example` menjadi `.env.local` dan isi kredensial.
2. Jalankan migrasi `supabase/migrations/202609220001_pintumedia.sql` pada proyek Supabase.
3. Jalankan `npm install`, lalu `npm run dev`.

Pilih satu gateway lewat `PAYMENT_PROVIDER=midtrans` atau `PAYMENT_PROVIDER=xendit`. Gunakan sandbox sampai seluruh alur webhook teruji. Endpoint `POST /api/checkout` membuat sesi pembayaran; webhook gateway memverifikasi pembayaran dan database mengaktifkan akses sekaligus menghitung komisi 20% secara idempoten.

Jangan pernah menaruh service-role key Supabase, Midtrans server key, atau Xendit secret key di browser maupun GitHub.

Jangan mengunggah atau menayangkan film, serial, poster, musik, atau subtitle tanpa izin pemegang hak.
