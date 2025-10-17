import { db } from "../services/sqlDB.js"; // ganti dari jsonDB.js ke sqlDB.js

function generateUserId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateUniqueUserId(existingIds, maxTry = 100) {
  const used = new Set(existingIds.map(String));
  for (let i = 0; i < maxTry; i++) {
    const id = generateUserId();
    if (!used.has(id)) return id;
  }
  return `${Date.now()}`.slice(-4);
}

/* ===================== AUTH CONTROLLERS ===================== */

// POST /login
export async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Username dan password wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id, username, password FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Login gagal" });
    }

    const user = rows[0];
    return res.json({
      message: "Login sukses",
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

// POST /register
export async function register(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Username dan password wajib diisi" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Password minimal 4 karakter" });
    }

    const [existingUser] = await db.query(
      "SELECT username FROM users WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username sudah terdaftar" });
    }

    // ambil semua ID dari database
    const [allUsers] = await db.query("SELECT id FROM users");
    const existingIds = allUsers.map(u => u.id);

    // generate ID unik
    const id = generateUniqueUserId(existingIds);

    // insert user baru
    await db.query(
      "INSERT INTO users (id, username, password) VALUES (?, ?, ?)",
      [id, username, password]
    );

    return res.status(201).json({
      message: "Registrasi berhasil",
      user: { id, username }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}