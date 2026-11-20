# ComicHub

Fondasi lokal aplikasi baca komik berbahasa Indonesia.

## Menjalankan

Gunakan Node.js 24 dan npm. Salin `.env.example` ke `.env.local` bila perlu mengubah URL situs.

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Di Windows PowerShell, gunakan `npm.cmd` jika kebijakan eksekusi memblokir `npm.ps1`.

## Pemeriksaan

```sh
npm run lint
npm run typecheck
npx playwright install chromium
npm test
npm run build
npm run format:check
```

Periksa Beranda pada lebar 320 px dan desktop. Gunakan Tab untuk mencapai tautan lewati, navigasi, dan pengalih tema. Ubah tema lalu muat ulang untuk memeriksa persistensi. Buka Jelajah, Koleksi, dan Setelan untuk memeriksa status fitur sementara.

Jika Google Chrome sudah terpasang di Windows, jalankan `$env:COMICHUB_BROWSER_CHANNEL = "chrome"` sebelum `npm.cmd test` untuk memakai Chrome yang ada. Uji Playwright menjalankan dev server terpisah pada port 3100.

## Diagnostik MangaDex

Aktifkan `FEATURE_MANGADEX=true` melalui lingkungan proses atau `.env.local`. Jalankan `npm run check:mangadex` untuk memeriksa pencarian, detail, dan feed chapter berbahasa Indonesia. Validasi kontrak tanpa jaringan tersedia melalui `npm run test:providers`. Timeout default 8 detik dapat diatur lewat `UPSTREAM_TIMEOUT_MS`.

Metadata MangaDex diuji melalui CLI. Pengiriman gambar chapter masih memerlukan izin konten. Kebijakan API mewajibkan atribusi MangaDex serta atribusi grup dan penanganan permintaan penghapusan apabila reader diaktifkan. Kebijakan tersebut juga membatasi penggunaan iklan dan layanan berbayar. [Kebijakan penggunaan API MangaDex](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md)

## Katalog dan reader

Di Jelajah, cari judul dan pilih genre seperti Fantasi, Aksi, atau Romansa. Genre berlaku untuk seluruh katalog. Setiap kartu tetap menampilkan nama sumbernya.

**Pepper & Carrot** bisa dibaca langsung di ComicHub dalam bahasa Indonesia. Daftar episode mengikuti indeks resmi dan menampilkan semua episode yang memiliki terjemahan Indonesia. Reader memuat gambar dari situs resmi serta menampilkan atribusi David Revoy, lisensi, dan kredit lengkap per episode. [API Pepper&Carrot](https://www.peppercarrot.com/en/documentation/130_API.html) · [Panduan atribusi](https://www.peppercarrot.com/en/documentation/120_License_best_practices.html)

Hasil pencarian Komiku membuka daftar chapter di ComicHub. Kartu pembaruan Komiku membuka reader chapter terbaru. Komikcast memakai katalog dan pencarian dari situs sumber.

Reader Komiku menayangkan gambar langsung dari host `img.komiku.org`. Setelah izin penayangan seluruh chapter suatu seri terverifikasi, tambahkan slug seri tersebut ke `KOMIKU_READER_ALLOWED_COMICS` di `.env.local`. Pisahkan beberapa slug dengan koma dan mulai ulang server setelah mengubah konfigurasi. Daftar kosong membuat reader mengembalikan `NO_LICENSE`. [Ketentuan Komiku](https://komiku.org/tos/)

Untuk menjalankan uji katalog live di Windows PowerShell dengan Chrome lokal, gunakan perintah berikut.

```powershell
$env:COMICHUB_TEST_LIVE = "true"
$env:COMICHUB_BROWSER_CHANNEL = "chrome"
npm.cmd test -- --workers=1
```

Uji katalog live juga membuka Pepper & Carrot di reader dan memeriksa gambar dari situs resmi. Uji reader lainnya memakai gambar fixture untuk memeriksa tampilan halaman dan navigasi antar-chapter. `npm run test:providers` menjalankan uji kontrak provider tanpa jaringan.

Reader MangaDex dapat dibuka melalui tautan **Reader ComicHub** pada daftar chapter. Penayangan gambar MangaDex masih memerlukan izin konten dan pemenuhan aturan pengiriman. [Panduan pengiriman gambar MangaDex@Home](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/04-chapter/retrieving-chapter.md)
