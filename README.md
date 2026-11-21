# ComicHub

Fondasi lokal aplikasi baca komik berbahasa Indonesia.

## Menjalankan

Gunakan Node.js 24 dan npm. Salin `.env.example` ke `.env.local` bila perlu mengubah URL situs.

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Di Windows PowerShell, gunakan `npm.cmd` jika kebijakan eksekusi memblokir `npm.ps1`.

## Shinigami untuk penggunaan pribadi

### Lokal

Jalankan [KanekiCraynet/api-manga](https://github.com/KanekiCraynet/api-manga) di folder terpisah. Repo API menetapkan Node.js 22 dan npm 9.5.0. ComicHub memakai Node.js 24, jadi jalankan masing-masing di terminal dengan versi Node.js yang sesuai.

Di terminal API, gunakan PowerShell untuk memasang dependensi dan membuka server hanya di `127.0.0.1:3300`.

```powershell
git clone --depth 1 --filter=blob:none --sparse https://github.com/KanekiCraynet/api-manga.git
Set-Location api-manga
git sparse-checkout set src public
npm.cmd ci --ignore-scripts
@'
process.env.VERCEL = '1';
const app = require('./src/server');
app.listen(3300, '127.0.0.1', () => console.log('api-manga http://127.0.0.1:3300'));
'@ | node
```

Pengaturan `VERCEL=1` di proses Node di atas membuat modul mengekspor aplikasi tanpa membuka port bawaannya. Cek [status API lokal](http://127.0.0.1:3300/health) sebelum menjalankan ComicHub.

Di folder ComicHub, isi `.env.local` dengan pengaturan berikut untuk memakai kedua katalog. Buat file dari `.env.example` jika belum ada.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FEATURE_MANGADEX=true
FEATURE_LOCAL_API_MANGA=true
```

Jalankan `npm.cmd ci` dan `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000` dari terminal ComicHub. Buka [Jelajah Shinigami](http://localhost:3000/explore?source=Shinigami), pilih judul, lalu klik **Baca chapter terbaru**. ComicHub memakai `api-manga` lokal untuk katalog dan API Shinigami untuk detail seri, gambar, dan navigasi antar-chapter.

### Preview Vercel

Aktifkan **Vercel Authentication** untuk preview dan verifikasi bahwa URL preview meminta login. Di pengaturan environment Vercel, isi `FEATURE_PRIVATE_SHINIGAMI=true` hanya untuk **Preview**. Isi `FEATURE_MANGADEX=true` untuk Preview jika ingin menampilkan MangaDex, lalu deploy ulang ke Preview. Vercel menyediakan `VERCEL_ENV=preview` secara otomatis. [Deployment Protection](https://vercel.com/docs/deployment-protection)

Preview mengambil katalog dan chapter langsung dari API Shinigami. `FEATURE_LOCAL_API_MANGA` berlaku saat menjalankan `next dev`. Katalog dan reader Shinigami dinonaktifkan di deployment Production. Jika daftar chapter lengkap sedang gagal, tombol **Chapter sebelumnya** dan **Chapter berikutnya** memakai ID yang tersedia dari data chapter.

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

Dengan flag aktif, MangaDex muncul di Beranda dan Jelajah (judul yang punya terjemahan Indonesia, rating aman saja), dan chapter-nya dibaca di reader ComicHub.

[Kebijakan penggunaan API MangaDex](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md) mengizinkan pemakaian gratis dengan tiga syarat. ComicHub memenuhinya sebagai berikut.

- **Kredit MangaDex.** Footer, halaman Tentang, kartu katalog, halaman detail, dan reader menyebut serta menautkan MangaDex.
- **Kredit grup scanlation dan permintaan penghapusan.** Nama grup tampil di setiap chapter dan di reader. Untuk memenuhi permintaan penghapusan, tambahkan UUID grup ke `MANGADEX_BLOCKED_GROUPS` (pisahkan dengan koma) lalu mulai ulang server. Isi `CONTACT_EMAIL` agar halaman Tentang menampilkan alamat pengajuan.
- **Tanpa iklan dan layanan berbayar.** Jangan menambahkan keduanya selama MangaDex dipakai.

## Katalog dan reader

Di Jelajah, cari judul dan pilih genre seperti Fantasi, Aksi, atau Romansa. Genre berlaku untuk seluruh katalog. Setiap kartu tetap menampilkan nama sumbernya.

**Pepper & Carrot** bisa dibaca langsung di ComicHub dalam bahasa Indonesia. Daftar episode mengikuti indeks resmi dan menampilkan semua episode yang memiliki terjemahan Indonesia. Reader memuat gambar dari situs resmi serta menampilkan atribusi David Revoy, lisensi, dan kredit lengkap per episode. [API Pepper&Carrot](https://www.peppercarrot.com/en/documentation/130_API.html) · [Panduan atribusi](https://www.peppercarrot.com/en/documentation/120_License_best_practices.html)

Untuk menjalankan uji katalog live di Windows PowerShell dengan Chrome lokal, gunakan perintah berikut.

```powershell
$env:COMICHUB_TEST_LIVE = "true"
$env:COMICHUB_BROWSER_CHANNEL = "chrome"
npm.cmd test -- --workers=1
```

Uji katalog live juga membuka Pepper & Carrot di reader dan memeriksa gambar dari situs resmi. Uji reader lainnya memakai gambar fixture untuk memeriksa tampilan halaman dan navigasi antar-chapter. `npm run test:providers` menjalankan uji kontrak provider tanpa jaringan.

Reader MangaDex mengambil alamat gambar dari MangaDex@Home dan memuatnya langsung di browser. Hasil muat gambar dari node di luar `mangadex.org` dilaporkan ke MangaDex melalui `/api/reports/mangadex`. Chapter yang hanya tersedia di situs penerbit tidak dibuka di reader. Sampul MangaDex dimuat melalui `/api/covers`, karena MangaDex menolak hotlink dan mewajibkan situs pihak ketiga mem-proxy-nya. [Panduan pengiriman gambar MangaDex@Home](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/04-chapter/retrieving-chapter.md)
