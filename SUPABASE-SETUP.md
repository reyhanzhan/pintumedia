# Mengaktifkan API katalog resmi

1. Buat project di Supabase.
2. Jalankan `supabase/migrations/202609220001_pintumedia.sql`, lalu `supabase/migrations/202609220002_reference_platforms.sql` di SQL Editor. Migrasi kedua menyamakan 56 nama, urutan, dan ikon provider tanpa mengubah ID yang sudah dipakai oleh drama.
3. Salin nilai berikut ke `.env.local` (jangan commit file ini):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dipakai untuk katalog publik yang dilindungi RLS. `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai route server untuk checkout dan webhook; jangan pernah memasukkannya ke komponen client atau mengirimkannya ke browser.

Setelah tabel `platforms`, `series`, dan `episodes` berisi data berlisensi dan `series.is_published = true`, PintuMedia otomatis membaca katalog dari `GET /api/catalog`. Tanpa konfigurasi, route tersebut memakai katalog preview lokal.

API video dari DramaVerse, DramaBox, atau platform lain tidak dapat dipasang hanya dari nama situs. Minta dokumentasi dan kredensial API partner resmi dari vendor tersebut; jangan mengambil video dengan scraping atau menyalin endpoint internal.
