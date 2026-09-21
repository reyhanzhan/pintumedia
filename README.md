# NunoDrama

Prototipe responsif platform streaming drama untuk `nunodrama.my.id`.

## Yang sudah tersedia

- tampilan katalog mobile dan desktop;
- lima episode pertama terbuka;
- episode 6–10 memunculkan paywall;
- pilihan paket mingguan, bulanan, dan unlock per serial;
- aktivasi akses demo untuk menguji alur;
- dashboard affiliate dengan link referral dan simulasi komisi;
- pencarian, login demo, dan navigasi seluler;
- catatan penggunaan konten berlisensi.

## Menjalankan prototipe

Buka `dist/index.html` melalui server web statis. Seluruh antarmuka ada di folder `dist` dan tidak memerlukan proses build.

## Menuju produksi

Untuk versi produksi, gunakan Next.js untuk aplikasi, database PostgreSQL/Supabase untuk akun dan transaksi, penyimpanan video berlisensi dengan CDN, serta Midtrans atau Xendit untuk pembayaran. Komisi affiliate harus dihitung dari webhook pembayaran yang sudah terverifikasi di server.

Jangan mengunggah atau menayangkan film, serial, poster, musik, atau subtitle tanpa izin pemegang hak.
