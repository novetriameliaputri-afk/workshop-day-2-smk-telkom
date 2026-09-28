# DOKUMENTASI PENGUJIAN SISTEM (TEST_CASES.md)
## Sistem Peminjaman Sarpras Laboratorium RPL & Elektronika
**Standar Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak & Industri**  
**Sekolah:** SMK Telkom  
**Arsitektur:** Node.js + Express (MVC) + Prisma ORM + SQLite + EJS + Tailwind CSS  
**Model Keamanan:** Session-based Authentication & Role-Based Access Control (RBAC) 3 Level (ADMIN, TOOLMAN, PEMINJAM)

---

## 1. Matriks Hak Akses Pengguna (Role-Based Access Control)

| No | Fitur / Operasi Sistem | Admin (Kepala Lab) | Toolman (Laboran) | Peminjam (Siswa/Guru) | Status Otorisasi |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1 | Login & Logout Multi-Role | ✅ Ya | ✅ Ya | ✅ Ya | `200 OK` / Sesi Aktif |
| 2 | CRUD Master Pengguna (User) | ✅ Ya | ❌ Ditolak (403) | ❌ Ditolak (403) | RBAC Guarded |
| 3 | CRUD Inventaris Alat Praktikum | ✅ Ya | ❌ Ditolak (403) | ❌ Ditolak (403) | RBAC Guarded |
| 4 | CRUD Master Kategori Alat | ✅ Ya | ❌ Ditolak (403) | ❌ Ditolak (403) | RBAC Guarded |
| 5 | CRUD Master Data Transaksi | ✅ Ya | ❌ Read Only/Proses | ❌ Read Only Sendiri | RBAC Guarded |
| 6 | Memantau Audit Log Laboratorium | ✅ Ya | ❌ Ditolak (403) | ❌ Ditolak (403) | RBAC Guarded |
| 7 | Menyetujui (Approval) Pinjaman | ✅ Ya | ✅ Ya | ❌ Ditolak (403) | RBAC Guarded |
| 8 | Memantau Pengembalian Alat | ✅ Ya | ✅ Ya | ❌ Read Only Sendiri | RBAC Guarded |
| 9 | Pemeriksaan Fisik Alat & Input Denda | ✅ Ya | ✅ Ya | ❌ Ditolak (403) | RBAC Guarded |
| 10 | Mencetak Laporan Sirkulasi (PDF) | ✅ Ya | ✅ Ya | ❌ Ditolak (403) | RBAC Guarded |
| 11 | Melihat Katalog & Ketersediaan Stok | ✅ Ya | ✅ Ya | ✅ Ya | `200 OK` |
| 12 | Mengajukan Permohonan Pinjam | ✅ Ya | ❌ Role Peminjam | ✅ Ya | Form Pinjam |
| 13 | Mengembalikan Alat ke Meja Toolman | ❌ Meja Toolman | ❌ Meja Toolman | ✅ Ya | Konfirmasi Siswa |

---

## 2. 5 Skenario Pengujian Wajib (Verification & Acceptance Testing)

### 🧪 SKENARIO 1: Login User Sesuai dengan Hak Akses (Multi-Role RBAC)
* **ID Pengujian:** `TC-SARPRAS-01`
* **Tujuan:** Memvalidasi bahwa setiap pengguna (Admin, Toolman, Peminjam Siswa) dapat login menggunakan kredensial masing-masing, diarahkan ke dashboard khusus sesuai rolenya, dan dicegah mengakses rute di luar hak aksesnya (403 Forbidden).
* **Pra-kondisi:** Database telah diseed dengan akun demo (`admin`, `toolman`, `peminjam` / password: `password123`).
* **Langkah-langkah Pengujian:**
  1. Akses halaman login di URL `http://localhost:3000/auth/login`.
  2. Klik tombol demo `1. Admin (Kepala Lab / IT)` atau masukkan user: `admin`, pass: `password123`.
  3. Verifikasi dashboard menampilkan menu khusus Admin (Master Pengguna, Master Alat, Master Kategori, Audit Log).
  4. Logout dari sistem (`/auth/logout`).
  5. Login sebagai `toolman` (pass: `password123`).
  6. Verifikasi dashboard menampilkan antrean verifikasi approval dan inspeksi pengembalian.
  7. Coba akses rute admin sensitif, misalnya `http://localhost:3000/users` atau `http://localhost:3000/activity-logs`.
  8. Verifikasi sistem memberikan respons status **403 Forbidden** dengan halaman penolakan hak akses resmi.
  9. Logout dan login sebagai `peminjam` (pass: `password123`).
  10. Verifikasi hanya melihat alat yang tersedia dan riwayat pinjaman miliknya sendiri.
* **Hasil yang Diharapkan:**
  - Login berhasil untuk ketiga role.
  - Sesi tersimpan aman pada HTTP-only cookie.
  - Percobaan akses ke rute terlarang menghasilkan HTTP 403 Forbidden.
  - Aktivitas login tercatat di tabel `ActivityLog`.
* **Status Pengujian:** **PASSED (LULUS)** ✅

---

### 🧪 SKENARIO 2: Admin Menambah Inventaris Alat Praktikum Baru
* **ID Pengujian:** `TC-SARPRAS-02`
* **Tujuan:** Memastikan Admin dapat mendaftarkan alat praktikum baru ke inventaris lab dengan kategori yang sesuai, spesifikasi teknis lengkap, dan stok awal 5 unit.
* **Aktor:** Admin (`admin`)
* **Pra-kondisi:** Login sebagai Admin, kategori "Jaringan" sudah tersedia di sistem.
* **Langkah-langkah Pengujian:**
  1. Masuk ke menu **Inventaris Alat Lab** (`/tools`) atau klik **Tambah Alat Baru** (`/tools/new`).
  2. Isi formulir penambahan alat:
     - **Nama Alat Praktikum:** `Mikrotik RouterBoard RB951Ui-2HnD`
     - **Kategori Alat:** `Jaringan`
     - **Spesifikasi Teknis:** `Wireless AP SOHO 2.4GHz, 5 Port Fast Ethernet, USB port, PoE-Out port 5, RouterOS Level 4`
     - **Jumlah Stok Awal:** `5`
     - **Kondisi Fisik:** `BAIK`
  3. Klik tombol **Simpan & Tambahkan Alat**.
  4. Sistem mengarahkan kembali ke daftar alat `/tools` dengan banner notifikasi sukses.
  5. Periksa tabel inventaris: alat `Mikrotik RouterBoard RB951Ui-2HnD` tampil dengan stok `5 Unit` dan badge kondisi hijau `BAIK`.
* **Hasil yang Diharapkan:**
  - Data alat tersimpan di database SQLite pada model `Tool`.
  - Tercipta rekam jejak pada tabel `ActivityLog` dengan aksi `TAMBAH_ALAT` ("Admin menambahkan inventaris baru: Mikrotik RouterBoard...").
* **Status Pengujian:** **PASSED (LULUS)** ✅

---

### 🧪 SKENARIO 3: Siswa Mengajukan Peminjaman 1 Unit Mikrotik untuk Praktikum
* **ID Pengujian:** `TC-SARPRAS-03`
* **Tujuan:** Memastikan siswa dapat melihat alat yang tersedia, memilih alat, dan mengajukan permohonan pinjam dengan status awal `PENDING`.
* **Aktor:** Peminjam Siswa (`peminjam`)
* **Pra-kondisi:** Login sebagai siswa Fajar Pratama (`peminjam`). Alat `Mikrotik RouterBoard RB951Ui-2HnD` tersedia dengan stok 5 unit.
* **Langkah-langkah Pengujian:**
  1. Masuk ke halaman **Katalog & Stok Alat** (`/tools`) atau klik menu **Ajukan Pinjam Alat** (`/borrowings/new`).
  2. Pilih alat: `Mikrotik RouterBoard RB951Ui-2HnD (Stok Tersedia: 5 unit)`.
  3. Masukkan jumlah pinjam: `1`.
  4. Tentukan batas tanggal rencana pengembalian (misalnya: esok hari).
  5. Isi keterangan keperluan: `Praktikum konfigurasi DHCP Server & Hotspot Gateway UKK Paket 2 di Lab Jaringan`.
  6. Klik tombol **Kirim Permohonan Pinjam**.
  7. Periksa tabel di halaman **Pinjaman Saya** (`/borrowings`).
* **Hasil yang Diharapkan:**
  - Transaksi baru tercatat dengan status badge kuning `PENDING`.
  - Stok fisik belum berkurang sebelum persetujuan resmi Toolman (masih 5 unit).
  - Tercipta log pada `ActivityLog` dengan aksi `AJUKAN_PINJAM`.
* **Status Pengujian:** **PASSED (LULUS)** ✅

---

### 🧪 SKENARIO 4: Toolman Menyetujui Peminjaman & Stok Alat Berkurang Menjadi 4 Unit
* **ID Pengujian:** `TC-SARPRAS-04`
* **Tujuan:** Memvalidasi mekanisme persetujuan (approval) oleh Toolman lab, pengurangan stok fisik secara atomik, dan perubahan status transaksi menjadi `APPROVED`.
* **Aktor:** Toolman / Laboran (`toolman`)
* **Pra-kondisi:** Terdapat permohonan pinjam status `PENDING` dari siswa Fajar Pratama untuk 1 unit Mikrotik.
* **Langkah-langkah Pengujian:**
  1. Login sebagai `toolman` (pass: `password123`).
  2. Di dashboard Toolman, perhatikan antrean **Antrean Permohonan Peminjaman (Approval)**.
  3. Temukan transaksi peminjaman `Mikrotik RouterBoard RB951Ui-2HnD` oleh `Fajar Pratama (Jumlah: 1 Unit, Stok Saat Ini: 5 Unit)`.
  4. Klik tombol hijau **Setujui** (`POST /borrowings/:id/approve`).
  5. Konfirmasi popup persetujuan.
  6. Sistem memproses database transaction secara atomik:
     - Mengubah status peminjaman menjadi `APPROVED`.
     - Mengisi `toolmanId` dengan ID Toolman yang menyetujui.
     - Mengurangi stok pada model `Tool` sejumlah 1 unit.
  7. Buka halaman **Cek Stok Alat Lab** (`/tools`).
  8. Periksa stok alat `Mikrotik RouterBoard RB951Ui-2HnD`: Stok telah berkurang dari 5 unit menjadi **4 Unit**.
* **Hasil yang Diharapkan:**
  - Status peminjaman berubah menjadi `APPROVED` (Dipinjam).
  - Stok alat di tabel `Tool` berkurang tepat 1 unit menjadi **4 unit**.
  - Tercipta log aktifitas pada `ActivityLog` dengan aksi `APPROVAL_PINJAM`.
* **Status Pengujian:** **PASSED (LULUS)** ✅

---

### 🧪 SKENARIO 5: Pengembalian Alat Kondisi Rusak, Hitung Denda & Audit Log
* **ID Pengujian:** `TC-SARPRAS-05`
* **Tujuan:** Memvalidasi alur pengembalian alat praktikum, simulasi pemeriksaan fisik saat alat rusak (port LAN patah / adaptor terbakar), penetapan denda ganti rugi, penambahan kembali stok ke lab, dan pencatatan riwayat audit lengkap.
* **Aktor:** Toolman / Laboran (`toolman`)
* **Pra-kondisi:** Peminjaman 1 unit Mikrotik sedang aktif (`APPROVED`).
* **Langkah-langkah Pengujian:**
  1. Di dashboard Toolman atau daftar sirkulasi `/borrowings`, temukan pinjaman Mikrotik atas nama Fajar Pratama.
  2. Klik tombol **Cek Fisik & Pengembalian** (`GET /borrowings/:id/return`).
  3. Pada form inspeksi fisik:
     - Pilih kondisi fisik pengembalian: radio button `RUSAK / PATAH`.
     - Sistem otomatis menyesuaikan preset denda kerusakan. Masukkan nominal denda: `Rp 50.000` (atau nominal sesuai klausul ganti rugi lab).
     - Isi catatan detail inspeksi fisik: `Port Ether 1 WAN patah pada pin tembaga dan adaptor mengalami korsleting karena kelalaian siswa saat praktikum`.
     - Centang opsi: `Tandai status master alat di inventaris sebagai "RUSAK" (Perlu Servis Lab)` jika diperlukan.
  4. Klik tombol **Simpan & Selesaikan Pengembalian** (`POST /borrowings/:id/return`).
  5. Verifikasi di tabel sirkulasi `/borrowings`:
     - Status transaksi berubah menjadi `RETURNED` (Selesai).
     - Badge kondisi fisik bertuliskan merah `RUSAK`.
     - Nominal denda tercatat: `Rp 50.000`.
     - Tanggal pengembalian riil (`tglKembaliReal`) terisi otomatis sesuai waktu server.
  6. Login sebagai Admin (`admin`) dan buka menu **Log Aktifitas Lab** (`/activity-logs`).
  7. Verifikasi baris log audit terbaru:
     - Aksi: `PENGEMBALIAN_ALAT`
     - Pengguna: `Rian Hidayat (TOOLMAN)`
     - Keterangan: *"Pemeriksaan fisik pengembalian 1 unit Mikrotik RouterBoard... dari peminjam Fajar Pratama. Kondisi fisik: RUSAK. Dikenakan Denda: Rp 50.000..."*
  8. Buka menu **Laporan Sirkulasi** (`/reports`):
     - Total penerimaan kas denda bertambah Rp 50.000.
     - Laporan siap dicetak via tombol **Cetak Laporan Resmi (PDF/Print)** lengkap dengan tanda tangan Toolman & Kepala Lab.
* **Hasil yang Diharapkan:**
  - Status peminjaman berhasil diselesaikan (`RETURNED`).
  - Kerusakan fisik dan denda tercatat secara akurat di database.
  - Audit trail `ActivityLog` mencatat nama pemeriksa, kondisi fisik, dan nominal denda secara transparan.
* **Status Pengujian:** **PASSED (LULUS)** ✅

---

## 3. Ringkasan Eksekusi Pengujian Otomatis & Manual

| ID Kasus | Deskripsi Skenario | Kategori Pengujian | Hasil Pengujian |
|:---|:---|:---|:---:|
| `TC-SARPRAS-01` | Multi-role Authentication & RBAC 3 Level (Admin, Toolman, Siswa) | Keamanan & Otorisasi | **LULUS (PASSED)** |
| `TC-SARPRAS-02` | Admin CRUD & Registrasi Inventaris Baru (Stok 5 Unit) | Fungsionalitas Admin | **LULUS (PASSED)** |
| `TC-SARPRAS-03` | Siswa Mengajukan Peminjaman 1 Unit Alat | Fungsionalitas Peminjam | **LULUS (PASSED)** |
| `TC-SARPRAS-04` | Toolman Approval & Pengurangan Stok Atomik (Menjadi 4 Unit) | Fungsionalitas Sirkulasi | **LULUS (PASSED)** |
| `TC-SARPRAS-05` | Pemeriksaan Pengembalian Fisik Rusak, Denda, & Audit Log | Fungsionalitas Inspeksi & Audit | **LULUS (PASSED)** |

**Kesimpulan:** Seluruh 5 skenario pengujian standar UKK dan industri telah selesai diimplementasikan, diverifikasi, dan memenuhi seluruh kriteria kelulusan sistem.
