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

Dengan flag aktif, MangaDex muncul di Beranda dan Jelajah (judul yang punya terjemahan Indonesia, rating aman saja), dan chapter-nya dibaca di reader ComicHub.

[Kebijakan penggunaan API MangaDex](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md) mengizinkan pemakaian gratis dengan tiga syarat. ComicHub memenuhinya sebagai berikut.

- **Kredit MangaDex.** Footer, halaman Tentang, kartu katalog, halaman detail, dan reader menyebut serta menautkan MangaDex.
- **Kredit grup scanlation dan permintaan penghapusan.** Nama grup tampil di setiap chapter dan di reader. Untuk memenuhi permintaan penghapusan, tambahkan UUID grup ke `MANGADEX_BLOCKED_GROUPS` (pisahkan dengan koma) lalu mulai ulang server. Isi `CONTACT_EMAIL` agar halaman Tentang menampilkan alamat pengajuan.
- **Tanpa iklan dan layanan berbayar.** Jangan menambahkan keduanya selama MangaDex dipakai.

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

Reader MangaDex mengambil alamat gambar dari MangaDex@Home dan memuatnya langsung di browser. Hasil muat gambar dari node di luar `mangadex.org` dilaporkan ke MangaDex melalui `/api/reports/mangadex`. Chapter yang hanya tersedia di situs penerbit tidak dibuka di reader. Sampul MangaDex dimuat melalui `/api/covers`, karena MangaDex menolak hotlink dan mewajibkan situs pihak ketiga mem-proxy-nya. [Panduan pengiriman gambar MangaDex@Home](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/04-chapter/retrieving-chapter.md)
