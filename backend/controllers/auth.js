import { db } from "../services/sqlDB.js";
import bcrypt from "bcrypt";

/* ===================== Helper Functions ===================== */
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
    const { identifier, password } = req.body || {}; // identifier = username atau email

    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Username/email dan password wajib diisi" });
    }

    // cari user berdasarkan username atau email
    const [rows] = await db.query(
      "SELECT id, username, email, password FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    const user = rows[0];

    // cocokkan password (karena sudah di-hash)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    return res.json({
      message: "Login sukses",
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

// POST /register
export async function register(req, res) {
  try {
    const { username, email, password } = req.body || {};

    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Username, email, dan password wajib diisi" });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: "Password minimal 4 karakter" });
    }

    // cek apakah username/email sudah dipakai
    const [existingUser] = await db.query(
      "SELECT username, email FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Username atau email sudah terdaftar" });
    }

    // ambil semua ID buat bikin ID unik
    const [allUsers] = await db.query("SELECT id FROM users");
    const existingIds = allUsers.map(u => u.id);
    const id = generateUniqueUserId(existingIds);

    // hash password sebelum simpan
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [id, username, email, hashedPassword]
    );

    return res.status(201).json({
      message: "Registrasi berhasil",
      user: { id, username, email }
    });
  } catch (err) {
    console.error("❌ Error register:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}
export function updateProfile(req, res) {
  const { id, username, email, password } = req.body || {};
  if (!id) return res.status(400).json({ message: "User id is required" });

  const users = db.readUsers();
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return res.status(404).json({ message: "User not found" });

  // validate inputs if provided
  if (username && !username.toString().trim()) {
    return res.status(400).json({ message: "Username tidak valid" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString())) {
    return res.status(400).json({ message: "Email tidak valid" });
  }
  if (password && password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters" });
  }

  // ensure username/email uniqueness among other users
  const conflict = users.find(u => u.id !== id && ( (username && u.username === username) || (email && u.email === email) ));
  if (conflict) return res.status(409).json({ message: "Username atau email sudah digunakan" });

  const user = users[userIndex];
  if (username) user.username = username;
  if (email) user.email = email;
  if (password) user.password = password;

  users[userIndex] = user;
  db.writeUsers(users);

  return res.json({ message: "Profile updated", user: { id: user.id, username: user.username, email: user.email } });
}