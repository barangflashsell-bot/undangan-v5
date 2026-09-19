# Undangan Digital V5

Aplikasi Undangan Digital Mobile-First dengan 3 Jenis Akses Terpisah:
1. **ADMIN**: Login menggunakan ID & Sandi Admin (`/admin/login` & `/admin`).
2. **PENYEWA**: Akses instan via **Management Link** unik (`/manage/:managementToken`) tanpa login / password.
3. **TAMU**: Akses via **Guest Link** unik (`/u/:slug/:guestToken`) dengan nama tamu tertera otomatis di cover undangan.

---

## Fitur Utama

- **Zero Authentication untuk Penyewa & Tamu**: Penyewa cukup membuka link pengelolaan khusus, tamu cukup membuka link undangan.
- **Backend Ownership Validation**: Validasi kepemilikan undangan divalidasi langsung di database per request.
- **Autosave Nama & Konten**: Judul dan seluruh isian undangan langsung tersimpan secara otomatis.
- **Tombol 🔗 BAGIKAN Selalu Terlihat**: Tombol Share beranimasi selalu ada di sticky header untuk kemudahan membagikan ke WhatsApp atau media sosial.
- **Data Aman Saat Ganti Tema**: 4 tema visual mewah (*Islami Emerald, Rose Gold, Modern Minimalist, Rustic Flora*) dapat diganti kapan saja tanpa pernah menghapus data teks, foto, atau daftar tamu.
- **Fitur Lengkap & Fungsional**:
  - Cover Screen interaktif dengan nama tamu khusus
  - Musik latar otomatis (dengan tombol kontrol melayang)
  - Profil mempelai & kutipan suci
  - Countdown timer menuju hari H
  - Rangkaian acara (Akad & Resepsi) + Tombol Google Maps
  - Galeri foto & Lightbox layar penuh
  - Amplop digital & salin nomor rekening 1-klik
  - Konfirmasi kehadiran (RSVP) & buku ucapan doa real-time

---

## Instalasi & Menjalankan Aplikasi

1. Clone repositori:
   ```bash
   git clone https://github.com/barangflashsell-bot/undangan-v5.git
   cd undangan-v5
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka di browser:
   - Portal Utama: `http://localhost:3000`
   - Admin Login: `http://localhost:3000/admin/login` (ID: `admin`, Sandi: `admin123`)
   - Demo Penyewa: `http://localhost:3000/manage/AbC82xP92LmK7nQ4`
   - Demo Tamu: `http://localhost:3000/u/wedding-andi-sinta/X7mQa9`
