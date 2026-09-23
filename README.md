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

## Cloudflare Stream untuk video milik sendiri

PintuMedia menyediakan integrasi server-side yang aman:

- `POST /api/cloudflare/direct-upload` membuat URL upload satu kali. Browser mengunggah langsung ke Cloudflare sehingga token API tidak pernah masuk ke browser.
- `GET /api/cloudflare/playback?uid=...` mengembalikan URL HLS, DASH, dan iframe untuk UID video yang sudah disimpan di database.

Isi `CLOUDFLARE_ACCOUNT_ID`, token API dengan izin **Account → Stream → Edit**, dan `CLOUDFLARE_STREAM_CUSTOMER_CODE` di environment Hostinger. Jangan menaruh token di `.env.example`, frontend, atau GitHub. Upload dan pemutaran hanya untuk konten yang Anda miliki atau lisensikan.

Cloudflare Stream mendukung direct creator upload dan manifest HLS/DASH; gunakan player resmi/HTML5 di halaman tontonan setelah UID episode tersimpan.

## Adapter DramaBos (42 provider)

DramaBos menyediakan API terpadu dengan Bearer API key. Adapter PintuMedia menggunakan endpoint `/{provider}/api/v1/home` untuk katalog dan `/{provider}/api/v1/play/{id}/{episode}` untuk playback. Konfigurasi di environment server:

```env
DRAMABOS_API_BASE_URL=https://dramabos.live
DRAMABOS_API_KEY=isi_di_hostinger
DRAMABOS_CONTENT_LICENSE_CONFIRMED=true
```

`DRAMABOS_CONTENT_LICENSE_CONFIRMED=true` adalah pengaman aplikasi: aktifkan hanya setelah Anda membaca Terms DramaBos dan memastikan hak distribusi/monetisasi konten provider yang dipilih. API key tidak pernah dikirim ke browser. Endpoint playback PintuMedia adalah `GET /api/dramabos/play?provider=bstation&id=...&episode=1`.

Dokumentasi resmi repo DramaBos menyebut API key, paket penggunaan, provider yang tersedia, dan URL HLS; cek [repository DramaBos](https://github.com/dramabosapi/dramabos-api), [dokumentasi API](https://dramabos.live/docs), dan [Terms](https://dramabos.live/terms) sebelum produksi.

## NunoDrama multi-provider API

Jika `NUNODRAMA_API_TOKEN` tersedia, adapter NunoDrama menjadi sumber katalog utama untuk provider yang didukung. Token hanya dibaca server melalui header `X-API-TOKEN`; browser memanggil endpoint internal PintuMedia sehingga token tidak bocor ke frontend.

```env
NUNODRAMA_API_BASE_URL=https://go.nunodrama.my.id
NUNODRAMA_API_TOKEN=isi_hanya_di_environment_server
```

Katalog menggunakan feed provider seperti `/api/dramabox/foryou` dan `/api/bstation/foryou`. Player menggunakan `GET /api/nunodrama/play?provider=dramabox&id=...&episode=1`; lima episode pertama mengikuti aturan gratis PintuMedia. Pastikan paket API dan hak penggunaan konten mengizinkan penayangan ulang serta monetisasi sebelum produksi.

## Adapter Bstation

Repository `Yudzxml/bstation` yang direferensikan menggunakan scraping halaman Bilibili.tv, membuat manifest DASH, lalu mem-proxy segmen CDN. Itu bukan API resmi provider dan tidak aman dijadikan sumber streaming ulang tanpa izin. PintuMedia sudah menambahkan validasi handoff resmi melalui `GET /api/bstation/resolve?url=...`; katalog Bstation mengarahkan penonton ke domain resmi sampai Anda memiliki API atau lisensi distribusi. Jika nanti Anda memiliki sumber berizin, adapter dapat dihubungkan ke tabel `episodes` dan Cloudflare Stream tanpa mengubah UI.
