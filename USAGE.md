# 📖 Panduan Penggunaan Bestea POS

Dokumentasi lengkap cara menggunakan aplikasi Bestea POS untuk pemilik bisnis dan kasir.

---

## Daftar Isi

1. [Memulai](#1-memulai)
2. [Login & Autentikasi](#2-login--autentikasi)
3. [Dashboard (Admin/Owner)](#3-dashboard-adminowner)
4. [Kasir (POS)](#4-kasir-pos)
5. [Pengaturan Akun](#5-pengaturan-akun)

---

## 1. Memulai

### Menjalankan Aplikasi

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Buka `http://localhost:3000` di browser (disarankan: Chrome/Edge untuk dukungan Bluetooth printer).

### Persyaratan

- **Browser**: Chrome, Edge, atau Brave (untuk Web Bluetooth)
- **Printer**: Thermal Bluetooth 58mm/80mm (untuk cetak struk)
- **Koneksi**: Internet untuk sinkronisasi data ke Supabase

---

## 2. Login & Autentikasi

### Alur Login

1. Buka aplikasi → halaman login tampil
2. Masukkan **email** dan **password**
3. Sistem mendeteksi role pengguna:
   - **Super Admin** → diarahkan ke Dashboard, bisa akses Kasir
   - **Admin Cabang** → diarahkan ke Dashboard (filter cabang sendiri)
   - **Kasir** → diarahkan langsung ke halaman Kasir

### PIN Kasir

- Kasir memiliki **PIN 4 digit** untuk autentikasi cepat saat membuka shift
- PIN diatur oleh Admin melalui menu Karyawan

---

## 3. Dashboard (Admin/Owner)

Dashboard adalah pusat pengelolaan bisnis. Hanya bisa diakses oleh **Super Admin** dan **Admin Cabang**.

### 3.1 Halaman Utama (`/dashboard`)

Menampilkan ringkasan bisnis:

| Komponen               | Informasi                                               |
| ---------------------- | ------------------------------------------------------- |
| **Stats Cards**        | Total pendapatan, jumlah transaksi, pengeluaran, profit |
| **Grafik Penjualan**   | Visualisasi tren penjualan (Tunai vs QRIS)              |
| **Penjualan Terakhir** | 5 transaksi terakhir                                    |
| **Produk Terlaris**    | Ranking produk berdasarkan jumlah terjual               |
| **Performa Cabang**    | Perbandingan revenue antar cabang                       |

> **Super Admin** melihat data semua cabang. **Admin Cabang** hanya melihat data cabangnya.

---

### 3.2 Manajemen Produk (`/dashboard/produk`)

#### Melihat Produk

- Tampilan kartu dengan gambar produk, harga, dan stok
- Filter berdasarkan **kategori** dan **pencarian nama**
- Status **Aktif/Nonaktif** untuk mengontrol ketersediaan di kasir

#### Menambah Produk

1. Klik tombol **"+ Tambah Produk"**
2. Isi informasi:
   - Nama produk
   - Kategori
   - Gambar produk (upload)
   - Varian (nama + harga), contoh: Medium Rp8.000, Large Rp10.000
   - Stok awal (opsional, jika track stock aktif)
3. Klik **Simpan**

#### Mengedit Produk

1. Klik produk yang ingin diedit
2. Ubah informasi yang diperlukan
3. Klik **Simpan**

#### Mengatur Stok

- **Track Stock**: Aktifkan untuk memantau stok secara otomatis
- Stok berkurang otomatis setelah transaksi di kasir
- Stok 0 = produk tampil sebagai "Habis" di kasir

---

### 3.3 Manajemen Karyawan (`/dashboard/karyawan`)

#### Data Karyawan

- Tabel berisi: Nama, Email, Telepon, Role, Cabang, Status, Gaji Pokok
- Filter karyawan berdasarkan role dan status

#### Menambah Karyawan

1. Klik **"+ Tambah Karyawan"**
2. Isi: Nama, Email, Telepon, Role, Cabang, Gaji Pokok, Rate per Jam
3. **PIN** otomatis di-generate (bisa di-regenerate)
4. Klik **Simpan**

#### Mengatur PIN

- PIN digunakan kasir untuk login cepat
- Klik **Reset PIN** pada karyawan untuk generate PIN baru
- Catat PIN dan berikan ke karyawan

---

### 3.4 Jadwal Shift (`/dashboard/karyawan/shift`)

#### Tampilan

- Grid mingguan: baris = karyawan, kolom = hari (Senin–Minggu)
- Navigasi ke minggu sebelumnya/berikutnya (hingga 4 minggu)

#### Mengatur Shift

1. Pilih **minggu** yang ingin diatur
2. Klik sel pada grid karyawan + hari
3. Pilih tipe shift:
   - 🔵 **Pagi** (07:00–15:00)
   - 🟠 **Sore** (15:00–23:00)
   - 🟣 **Office** (09:00–17:00)
   - ⚪ **Libur**
4. Klik **💾 Simpan Semua** untuk menyimpan seluruh jadwal minggu tersebut

#### Copy dari Minggu Sebelumnya

- Klik **"Copy Minggu Sebelumnya"** untuk menduplikasi jadwal minggu lalu

---

### 3.5 Absensi (`/dashboard/karyawan/absensi`)

#### Melihat Rekap

- Tabel absensi: Tanggal, Nama, Role, Check-in, Check-out, Status
- Filter berdasarkan **tanggal** dan **role**

#### Input Manual

1. Klik **"+ Input Manual"**
2. Pilih karyawan
3. Pilih tanggal dan status:
   - ✅ **Hadir** — isi jam check-in dan check-out
   - 🤒 **Sakit** — opsional tambah catatan
   - 📝 **Izin** — opsional tambah catatan
   - ❌ **Alpha** — tanpa keterangan

#### Ekspor

- Klik **Export** untuk download data absensi dalam format CSV

---

### 3.6 Payroll (`/dashboard/karyawan/payroll`)

#### Melihat Gaji

- Tabel payroll: Nama, Role, Jam Kerja, Gaji Pokok, Total Gaji, Status

#### Kalkulasi Gaji

Formula: `Total Gaji = Gaji Pokok + (Jam Kerja × Rate/Jam) - Potongan`

Potongan dihitung berdasarkan:

- **Alpha** (tanpa keterangan) = potongan per hari dari gaji pokok

#### Bayar Gaji

1. Klik tombol **"Bayar"** di baris karyawan
2. Konfirmasi pembayaran
3. Status berubah menjadi **"Paid"** dengan timestamp

#### Recalculate

- Klik **"Hitung Ulang"** untuk menghitung ulang payroll berdasarkan data absensi terbaru

---

### 3.7 Laporan (`/dashboard/laporan`)

#### Dashboard Laporan

- **Revenue Chart**: Grafik pendapatan per periode
- **Top Products**: Produk terlaris
- **Total Pengeluaran**: Ringkasan pengeluaran

#### Tambah Pengeluaran

1. Klik **"+ Tambah Pengeluaran"**
2. Isi: Kategori (Operasional/Bahan Baku/Sewa/Lainnya), Jumlah, Deskripsi
3. Klik **Simpan**

#### Riwayat Penjualan (`/dashboard/laporan/riwayat`)

- Tabel semua transaksi: Kode, Tanggal, Item, Total, Metode Bayar, Cabang
- Filter: Periode waktu, metode pembayaran, cabang
- **Export CSV** untuk download data

---

### 3.8 Cabang (`/dashboard/cabang`)

#### Melihat Cabang

- Tabel: Nama Cabang, Tipe (HQ/Cabang), Jumlah Karyawan

#### Menambah Cabang

1. Klik **"+ Tambah Cabang"**
2. Isi: Nama, Tipe, Alamat, Email, Telepon
3. Klik **Simpan**

---

## 4. Kasir (POS)

Halaman kasir adalah antarmuka utama untuk transaksi penjualan.

### 4.1 Membuka Shift

Sebelum bisa melakukan transaksi, kasir harus **membuka shift**:

1. Klik tombol **"Buka Shift"**
2. Masukkan **modal awal** (kas awal di laci)
3. Klik **Konfirmasi**
4. Shift terbuka — kasir bisa mulai transaksi

> **Catatan**: Jika kasir menutup browser dan kembali lagi, shift yang masih aktif akan **otomatis dilanjutkan** (resume).

---

### 4.2 Melakukan Transaksi

#### Menambah Item ke Keranjang

1. Pilih **kategori** produk (Tea, Milk, Squash, Coffee, dll)
2. Klik produk yang diinginkan
3. Jika produk memiliki varian, pilih varian (Medium/Large)
4. Produk masuk ke keranjang

#### Mengatur Keranjang

- **Tambah kuantitas**: Klik tombol **+**
- **Kurangi kuantitas**: Klik tombol **-**
- **Hapus item**: Klik tombol **🗑️ hapus**

#### Proses Pembayaran

1. Klik tombol **"Bayar"** (atau **"Checkout"**)
2. Modal pembayaran muncul:
   - Pilih metode: **Tunai** atau **QRIS**
   - Masukkan jumlah uang diterima (atau klik nominal cepat)
   - Kembalian dihitung otomatis
3. Klik **"Selesaikan Pesanan"**
4. ✅ Layar sukses tampil dengan jumlah kembalian
5. **Struk otomatis tercetak** (jika printer terhubung)
6. Klik **"Selesai"** → modal tertutup, stok produk terupdate

---

### 4.3 Menghubungkan Printer Bluetooth

1. Klik ikon **🖨️ Printer** di bagian atas kasir
2. Klik **"Connect Printer"**
3. Browser akan menampilkan daftar perangkat Bluetooth
4. Pilih printer thermal Anda
5. Status berubah menjadi **"Terhubung"** ✅

#### Pengaturan Printer

- **Ukuran Kertas**: 58mm atau 80mm
- **Chunk Size**: Ukuran data per pengiriman (default: 100)
- **Test Print**: Cetak struk uji coba

> **Browser yang didukung**: Chrome, Edge, Brave (Brave perlu aktifkan flag Web Bluetooth di `brave://flags`)

---

### 4.4 Struk / Receipt

Isi struk yang dicetak:

```
        [Logo Bestea]
      Bestea [Nama Cabang]
    Jl. Salem Kersikan Bangil
         081779677759

13 Feb 2026 17:00     #1115
Kasir: Fay
--------------------------------
Tiramisu (Large)
  1x 10.000          10.000
Jasmine Tea (Large)
  1x 3.000            3.000
--------------------------------
Produk: 2
Item: 2
--------------------------------
Total              Rp13.000
Tunai              Rp13.000
                       Lunas
--------------------------------
         Terima kasih
  Dicetak: 13 Feb 2026, 17:00
```

- **Nama cabang** otomatis sesuai cabang karyawan yang login
- **Cetak ulang** dari riwayat bisa melalui tombol "Cetak Struk" di sidebar

---

### 4.5 Riwayat Transaksi (Sidebar)

1. Klik tombol **"📋 Riwayat"** di bagian atas
2. Panel samping terbuka dengan 2 tab:
   - **Transaksi**: Daftar transaksi hari ini dalam shift aktif
   - **Pengeluaran**: Daftar pengeluaran kas selama shift
3. Setiap transaksi menampilkan: kode, waktu, metode bayar, kasir, total, item
4. Klik **"🖨️ Cetak Struk"** untuk cetak ulang (harus connect printer dulu)

---

### 4.6 Pengeluaran Kas (Cash-Out)

Untuk mencatat pengeluaran kas dari laci:

1. Klik tombol **"💰 Kas Keluar"**
2. Isi: **Jumlah** dan **Deskripsi** (contoh: "Beli es batu Rp20.000")
3. Klik **Konfirmasi**
4. Pengeluaran tercatat di shift dan laporan

---

### 4.7 Menutup Shift

Di akhir jam kerja:

1. Klik tombol **"Tutup Shift"**
2. Masukkan **kas aktual** di laci
3. Sistem menampilkan:
   - Total transaksi tunai & QRIS
   - Total pengeluaran
   - Kas yang diharapkan vs aktual
   - Selisih (jika ada)
4. Tambahkan **catatan** jika perlu
5. Klik **Konfirmasi Tutup Shift**

---

### 4.8 Mode Offline & Sinkronisasi

Aplikasi ini mendukung **Mode Lokal** (Offline) penuh.

- **Tanpa Internet?** Tetap bisa jualan. Status di pojok kanan atas akan berubah menjadi **"Mode Lokal"**.
- **Data Tersimpan**: Transaksi disimpan di browser (IndexedDB).
- **Nomor Antrian**: Tetap berurut (misal: `#005`, `#006`) meskipun offline.
- **Sinkronisasi**: Saat internet kembali nyala:
  1. Status berubah hijau **"Online"**
  2. Klik tombol **Sync** (jika ada data tertunda)
  3. Data upload otomatis ke server & stok terupdate

> **PENTING**: Jangan hapus cache browser saat masih ada transaksi yang belum di-sync.

#### ⚠️ Alur Kerja (SOP) Mode Offline

Agar data aman dan tidak hilang, ikuti urutan berikut:

1.  **Login & Buka Shift** (Wajib 🟢 **Online**)
    - Pastikan internet nyala saat awal membuka toko.
2.  **Jualan / Transaksi** (Bebas ⚫ **Offline** / 🟢 **Online**)
    - Jika internet mati di tengah jalan, lanjut saja transaksi.
3.  **Sync Data** (Wajib 🟢 **Online**)
    - Sebelum pulang, nyalakan internet dan pastikan semua data ter-upload (Status hijau).
4.  **Tutup Shift** (Wajib 🟢 **Online**)
    - Baru boleh tutup shift dan logout setelah sync selesai.

---

## 5. Pengaturan Akun

### Profil

- Ubah foto profil, email, nomor telepon
- Tersedia di menu **Pengaturan**

### Keamanan

- Ubah password akun
- Kelola PIN kasir (oleh Admin melalui menu Karyawan)

---

## Tips & FAQ

### ❓ Bagaimana jika internet mati saat transaksi?

Tenang, lanjutkan saja. Aplikasi otomatis masuk **Mode Lokal**. Transaksi akan disimpan di perangkat dan bisa di-upload (Sync) nanti saat online. Nomor struk tetap berurutan.

### ❓ Stok tidak berkurang setelah transaksi?

Pastikan fitur **"Track Stock"** diaktifkan pada produk tersebut di Dashboard Produk.

### ❓ Struk tidak tercetak?

1. Pastikan printer sudah di-connect via tombol **🖨️ Printer**
2. Gunakan browser **Chrome/Edge** (bukan Firefox/Safari)
3. Jika pakai Brave, aktifkan flag `Web Bluetooth` di `brave://flags`

### ❓ Tombol "Cetak Struk" di riwayat disabled?

Tombol aktif hanya jika printer sudah terhubung. Connect printer terlebih dahulu.

### ❓ Dashboard tidak update setelah transaksi di kasir?

Data stok dan laporan terupdate otomatis jika online. Jika offline, data akan masuk setelah **Sync** berhasil.

### ❓ PWA / Install sebagai App?

Pada production build (`npm run build && npm start`), buka di Chrome lalu klik **"Install"** di address bar untuk memasang sebagai aplikasi standalone.

---

> **Bestea POS v1.0.0** — Dibuat untuk pengelolaan bisnis minuman yang efisien 🍵
