# SkyCast — Secret Chat Application

> Repository ini merupakan kelanjutan dari repository sebelumnya yang dapat dilihat di (https://github.com/adriann03/simple-chatting-app).

SkyCast adalah aplikasi web dua lapisan yang menyembunyikan platform chat rahasia di balik tampilan aplikasi cuaca fungsional. Pada tampilan publik, pengguna melihat informasi cuaca real-time berbasis lokasi. Namun dengan mengetuk ikon cuaca sebanyak 5 kali lalu memasukkan PIN 4 digit, pengguna masuk ke sistem chat tersembunyi yang tampilannya menyerupai Discord.

---

## Demo

🔗 [https://genai-app-weathersecretchat-1-[...].us-central1.run.app](https://genai-app-weathersecretchat-1-[...].us-central1.run.app)

---

## Fitur

**Tampilan Cuaca (Layer Publik)**
- Informasi cuaca real-time berbasis lokasi (suhu, kelembaban, kondisi cuaca)
- Responsive di desktop maupun mobile
- Gestur rahasia: ketuk ikon cuaca 5 kali untuk membuka layer tersembunyi

**Chat Rahasia (Layer Tersembunyi)**
- Autentikasi PIN 4 digit sebagai lapisan keamanan tambahan
- Registrasi dan login via email/password (Supabase Auth)
- Tambah teman berdasarkan username, kirim/terima permintaan pertemanan
- Real-time chat menggunakan Supabase Realtime (WebSocket)
- Dark theme UI menyerupai Discord

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend / BaaS | Supabase (PostgreSQL + Auth + Realtime) |
| Hosting | Google Cloud Run |
| API Eksternal | OpenWeatherMap API |

---

## Arsitektur Cloud (NIST SP 800-145)

| Komponen | Implementasi |
|---|---|
| **Compute** | Google Cloud Run — container Docker di-deploy otomatis via Cloud Build |
| **Network** | HTTPS publik dengan SSL/TLS, Supabase Realtime WebSocket |
| **Storage** | Supabase PostgreSQL — tabel `profiles`, `friendships`, `messages` |
| **Application** | UI responsif dua lapisan (cuaca + chat tersembunyi) |
| **Service** | REST API OpenWeatherMap, Supabase Auth & Realtime API |

---

## Cara Akses Chat Tersembunyi

1. Buka aplikasi
2. Ketuk ikon cuaca sebanyak **5 kali**
3. Masukkan **PIN 4 digit**
4. Login atau daftar akun baru

---

## Tim Pengembang

| Nama | NPM | Peran |
|---|---|---|
| Steffany | [npm] | [peran] |
| Laudya | [npm] | [peran] |
| Adrian | [npm] | [peran] |
| Alysha | [npm] | [peran] |

---

*Cloud Computing UAS 2026*
