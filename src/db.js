const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, '..', 'undangan.sqlite');
const db = new DatabaseSync(DB_PATH);

// Helper for hashing password using scrypt
function hashPassword(password, salt = 'undangan_salt_v5') {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyPassword(password, storedHash, salt = 'undangan_salt_v5') {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// Generate random URL-safe tokens
function generateToken(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

// Initialize tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      management_token TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      theme_id TEXT DEFAULT 'islami-emerald',
      groom_name TEXT DEFAULT 'Muhammad Andi Pratama',
      groom_nickname TEXT DEFAULT 'Andi',
      groom_parents TEXT DEFAULT 'Putra pertama dari Bpk. Bambang Wijaya & Ibu Siti Aminah',
      groom_photo TEXT DEFAULT '',
      bride_name TEXT DEFAULT 'Siti Nur Aisyah',
      bride_nickname TEXT DEFAULT 'Sinta',
      bride_parents TEXT DEFAULT 'Putri kedua dari Bpk. H. Rahmat Hidayat & Ibu Hj. Rohana',
      bride_photo TEXT DEFAULT '',
      event_date TEXT DEFAULT '2026-10-25',
      akad_date TEXT DEFAULT 'Minggu, 25 Oktober 2026',
      akad_time TEXT DEFAULT '08.00 - 10.00 WIB',
      akad_location TEXT DEFAULT 'Masjid Agung Al-Falah',
      akad_address TEXT DEFAULT 'Jl. Pahlawan No. 45, Surabaya, Jawa Timur',
      akad_map_url TEXT DEFAULT 'https://maps.google.com',
      resepsi_date TEXT DEFAULT 'Minggu, 25 Oktober 2026',
      resepsi_time TEXT DEFAULT '11.00 - 14.00 WIB',
      resepsi_location TEXT DEFAULT 'Grand Ballroom Hotel Majapahit',
      resepsi_address TEXT DEFAULT 'Jl. Tunjungan No. 65, Surabaya, Jawa Timur',
      resepsi_map_url TEXT DEFAULT 'https://maps.google.com',
      quote_text TEXT DEFAULT 'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
      quote_source TEXT DEFAULT 'QS. Ar-Rum: 21',
      love_story TEXT DEFAULT '[]',
      gallery_photos TEXT DEFAULT '[]',
      music_url TEXT DEFAULT 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-113880.mp3',
      bank_accounts TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      guest_token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      category TEXT DEFAULT 'Tamu Undangan',
      attendance_status TEXT DEFAULT 'pending',
      total_pax INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
      guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      attendance TEXT DEFAULT 'hadir',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check admin
  const adminStmt = db.prepare('SELECT id FROM admins WHERE username = ?');
  const admin = adminStmt.get('admin');
  if (!admin) {
    const insertAdmin = db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)');
    insertAdmin.run('admin', hashPassword('admin123'));
    console.log('[DB] Default admin seeded: ID=admin, Pass=admin123');
  }

  // Create demo invitation if empty
  const countInvitations = db.prepare('SELECT COUNT(*) as count FROM invitations').get();
  if (countInvitations.count === 0) {
    const defaultLoveStory = JSON.stringify([
      { year: '2021', title: 'Pertama Kali Bertemu', desc: 'Berkenalan saat mengikuti kegiatan seminar kepemudaan di kampus.' },
      { year: '2023', title: 'Menjalin Komitmen', desc: 'Memutuskan untuk melangkah bersama dengan niat ibadah dan restu kedua orang tua.' },
      { year: '2026', title: 'Menuju Pelaminan', desc: 'Mengikat janji suci pernikahan untuk membangun keluarga sakinah mawaddah warahmah.' }
    ]);
    const defaultGallery = JSON.stringify([
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&auto=format&fit=crop&q=80'
    ]);
    const defaultBank = JSON.stringify([
      { bank_name: 'Bank BCA', account_number: '1234567890', account_holder: 'Muhammad Andi Pratama' },
      { bank_name: 'Bank Mandiri', account_number: '9876543210123', account_holder: 'Siti Nur Aisyah' }
    ]);

    const demoManagementToken = 'AbC82xP92LmK7nQ4';
    const insertInv = db.prepare(`
      INSERT INTO invitations (
        slug, title, management_token, is_active, theme_id,
        groom_name, groom_nickname, groom_parents,
        bride_name, bride_nickname, bride_parents,
        event_date, akad_date, akad_time, akad_location, akad_address,
        resepsi_date, resepsi_time, resepsi_location, resepsi_address,
        love_story, gallery_photos, bank_accounts
      ) VALUES (
        ?, ?, ?, 1, 'islami-emerald',
        'Muhammad Andi Pratama', 'Andi', 'Putra pertama dari Bpk. Bambang Wijaya & Ibu Siti Aminah',
        'Siti Nur Aisyah', 'Sinta', 'Putri kedua dari Bpk. H. Rahmat Hidayat & Ibu Hj. Rohana',
        '2026-10-25', 'Minggu, 25 Oktober 2026', '08.00 - 10.00 WIB', 'Masjid Agung Al-Falah', 'Jl. Pahlawan No. 45, Surabaya, Jawa Timur',
        'Minggu, 25 Oktober 2026', '11.00 - 14.00 WIB', 'Grand Ballroom Hotel Majapahit', 'Jl. Tunjungan No. 65, Surabaya, Jawa Timur',
        ?, ?, ?
      )
    `);
    const invResult = insertInv.run(
      'wedding-andi-sinta',
      'The Wedding of Andi & Sinta',
      demoManagementToken,
      defaultLoveStory,
      defaultGallery,
      defaultBank
    );
    const invId = invResult.lastInsertRowid;

    // Seed sample guests
    const insertGuest = db.prepare(`
      INSERT INTO guests (invitation_id, guest_token, name, category)
      VALUES (?, ?, ?, ?)
    `);
    const g1 = insertGuest.run(invId, 'X7mQa9', 'Bapak Dr. H. Ahmad & Keluarga', 'VIP');
    const g2 = insertGuest.run(invId, 'K82Lp3', 'Budi Santoso & Partner', 'Sahabat');
    const g3 = insertGuest.run(invId, 'Q91Mn7', 'Citra Lestari, S.Kom', 'Rekan Kerja');

    // Seed sample wishes
    const insertWish = db.prepare(`
      INSERT INTO wishes (invitation_id, guest_id, sender_name, message, attendance)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertWish.run(invId, g1.lastInsertRowid, 'Bapak Dr. H. Ahmad', 'Barakallahu lakum wa baraka alaikum wa jama\'a bainakuma fi khair. Semoga menjadi keluarga yang sakinah mawaddah warahmah.', 'hadir');
    insertWish.run(invId, g2.lastInsertRowid, 'Budi Santoso', 'Selamat ya bro Andi dan Sinta! Lancar sampai hari H dan bahagia selamanya!', 'hadir');

    console.log('[DB] Seeded demo invitation:');
    console.log('     Management Link: /manage/' + demoManagementToken);
    console.log('     Guest Link 1:    /u/wedding-andi-sinta/X7mQa9 (Bapak Dr. H. Ahmad & Keluarga)');
  }
}

module.exports = {
  db,
  initDb,
  hashPassword,
  verifyPassword,
  generateToken
};
