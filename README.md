# Perpustakaan Digital — Google Apps Script + Spreadsheet + GitHub

Paket ini adalah aplikasi web responsif untuk perpustakaan pribadi. Backend dan hosting aplikasi menggunakan Google Apps Script, database menggunakan Google Spreadsheet, file sampul buku disimpan di Google Drive, sedangkan GitHub menjadi tempat backup source code.

## Fitur versi ini
- Dashboard: jumlah judul, total eksemplar, stok tersedia, sedang dipinjam, dan terlambat.
- Katalog buku dengan foto sampul.
- Scan barcode ISBN melalui kamera HP/komputer (EAN-13, EAN-8, UPC-A).
- Pencarian metadata buku melalui Google Books API.
- Input manual jika metadata ISBN tidak tersedia.
- Tambah stok buku berdasarkan ISBN yang sama.
- Peminjaman dan pengembalian dengan stok otomatis.
- Peringatan keterlambatan.
- Laporan bulanan dan cetak / simpan PDF.
- Cetak kartu perpustakaan secara manual. Sesuai pilihan pemilik, tidak ada database anggota; nama kartu tidak disimpan.
- Tampilan responsif untuk Android dan desktop.

## 1. Siapkan Google Spreadsheet
1. Buka https://sheets.google.com dan buat spreadsheet baru bernama `Database Perpustakaan`.
2. Buka **Ekstensi → Apps Script**.
3. Di editor Apps Script, buka `Code.gs`, hapus kode contoh, lalu tempel isi file `Code.gs` dari paket.
4. Klik **+ → HTML**, beri nama tepat `Index`, lalu tempel isi file `Index.html`.
5. Buka **Project Settings** (ikon roda gigi), aktifkan **Show "appsscript.json" manifest file in editor** jika ingin memasang manifest dari paket.
6. Jika mengedit manifest, gunakan isi `appsscript.json` yang disertakan.
7. Klik Save.
8. Pilih fungsi `setupSheets` di dropdown fungsi, lalu klik Run. Setujui permintaan akses Google Sheets dan Drive. Fungsi ini membuat tab `Buku`, `Peminjaman`, dan `Pengaturan`.

## 2. Deploy Web App
1. Klik **Deploy → New deployment**.
2. Klik ikon roda gigi, pilih **Web app**.
3. Execute as: **Me** (agar aplikasi dapat menulis ke spreadsheet dan menyimpan foto ke Drive pemilik).
4. Who has access: untuk penggunaan pribadi, pilih **Only myself**. Jika dipakai orang lain, pilih opsi akses yang sesuai dan pahami bahwa pengguna yang diberi akses dapat mengirim transaksi ke spreadsheet.
5. Klik Deploy dan selesaikan otorisasi.
6. Salin URL yang berakhiran `/exec`. Itu alamat aplikasi yang digunakan sehari-hari.
7. Jangan membagikan akses editor Apps Script atau Spreadsheet kepada peminjam. Bagikan hanya URL web app jika memang dibutuhkan.

## 3. Upload source code ke GitHub
1. Buka https://github.com/new dan buat repository `perpustakaan-digital`.
2. Pilih Private untuk source code yang berisi konfigurasi internal atau jika tidak ingin dibuka umum.
3. Upload `Code.gs`, `Index.html`, `appsscript.json`, dan `README.md`.
4. GitHub hanya menyimpan source code/backup. **GitHub Pages tidak menjalankan `Code.gs` dan tidak menggantikan Apps Script.**
5. Setelah mengubah file di GitHub, salin perubahan ke editor Apps Script. Lalu **Deploy → Manage deployments → Edit → New version → Deploy**.

## 4. Cara menggunakan
### Menambah buku
1. Buka menu Tambah Buku.
2. Tekan Scan Barcode dan izinkan kamera. Arahkan ke barcode ISBN pada sampul belakang.
3. Aplikasi mencari data buku di Google Books. Periksa hasilnya.
4. Isi lokasi rak dan jumlah eksemplar.
5. Pilih foto sampul dari perangkat bila ingin mengganti/menambahkan foto. Maksimal 3 MB, JPG/PNG/WEBP.
6. Tekan Simpan Buku.

Jika scan gagal, ketik ISBN secara manual. Jika metadata tidak ditemukan, isi judul dan informasi buku sendiri.

### Peminjaman dan pengembalian
1. Menu Peminjaman → scan atau ketik ISBN.
2. Isi nama peminjam, kontak opsional, dan jumlah.
3. Simpan. Stok tersedia berkurang otomatis.
4. Di menu Riwayat, tekan Kembalikan saat buku diterima. Stok bertambah otomatis.

### Laporan bulanan
1. Buka menu Laporan.
2. Pilih bulan.
3. Tampilkan laporan.
4. Tekan Cetak / Simpan PDF untuk menyimpan atau mencetak laporan.

### Kartu perpustakaan
Menu Cetak Kartu membuat kartu sederhana dari nama yang dimasukkan saat itu. Tidak ada data anggota yang disimpan karena pilihan database anggota = Tidak.

## 5. Pengaturan penting
- Tab `Pengaturan`: sel B2 nama perpustakaan, B3 maksimal lama pinjam (hari), B4 kontak perpustakaan.
- Foto sampul disimpan dalam folder Google Drive bernama `Sampul Perpustakaan Digital`.
- Google Books tidak memiliki data untuk semua ISBN; aplikasi menyediakan input manual.
- Barcode buku biasanya EAN-13. Kamera memerlukan HTTPS dan izin kamera.
- Foto Drive dapat memerlukan izin akses Google. Jika kebijakan akun melarang sharing publik, thumbnail mungkin hanya tampil bagi pengguna yang punya izin Drive.
- Untuk keamanan, gunakan deployment `Only myself` jika aplikasi hanya dipakai sendiri dan jaga spreadsheet tetap privat.
- Versi ini belum menyediakan login petugas multi-level, denda otomatis, inventaris barcode label, atau pencadangan otomatis.

## Troubleshooting
- **Kamera tidak muncul:** buka URL `/exec` melalui Chrome, pastikan HTTPS dan izin kamera aktif. Tutup aplikasi lain yang memakai kamera.
- **ISBN tidak ditemukan:** periksa angka ISBN atau input data buku secara manual.
- **Gagal upload sampul:** periksa izin Google Drive dan ukuran gambar (maksimum 3 MB).
- **Perubahan kode tidak terlihat:** buat deployment versi baru, lalu refresh halaman.
- **Aplikasi minta izin ulang:** jalankan fungsi terkait dari editor Apps Script dan setujui otorisasi yang diminta.
