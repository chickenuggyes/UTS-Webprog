import { db } from "../services/sqlDB.js";
import bcrypt from "bcrypt";

/* ===================== Helper: Random ID ===================== */
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

/* ===================== LOGIN ===================== */
export async function login(req, res) {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Username/email dan password wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id, username, email, password, foto FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    res.json({
      message: "Login sukses",
      user: { id: user.id, username: user.username, email: user.email, avatar: user.foto || null }
    });

  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/* ===================== REGISTER ===================== */
export async function register(req, res) {
  try {
    const { username, email, password } = req.body || {};

    console.log("📥 Register request:", { username, email, passwordLength: password?.length });

    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Semua field wajib diisi" });
    }

    // Update validasi password sesuai frontend: minimal 8 karakter
    if (password.length < 8) {
      return res.status(400).json({ message: "Password minimal 8 karakter" });
    }

    // Validasi password harus mengandung simbol
    const symbolRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (!symbolRegex.test(password)) {
      return res.status(400).json({ message: "Password harus mengandung minimal satu simbol (!@#$%^&* dll)" });
    }

    // Validasi email harus ada @
    if (!email.includes('@')) {
      return res.status(400).json({ message: "Email harus mengandung karakter @" });
    }

    const [exist] = await db.query(
      "SELECT username, email FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (exist.length > 0) {
      return res.status(409).json({ message: "Username atau email sudah terdaftar" });
    }

    const [all] = await db.query("SELECT id FROM users");
    const id = generateUniqueUserId(all.map(u => u.id));

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
      [id, username, email, hashed]
    );

    console.log("✅ Register berhasil untuk user:", username);

    res.json({
      message: "Registrasi berhasil",
      user: { id, username, email }
    });

  } catch (err) {
    console.error("❌ Error register:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    });
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

/* ===================== UPDATE PROFILE (FINAL FIX) ===================== */
/* ===================== UPDATE PROFILE (WITH FOTO) ===================== */
export async function updateProfile(req, res) {
  try {
    const { id, username, email, password } = req.body || {};
    const foto = req.file ? req.file.filename : null;

    if (!id) return res.status(400).json({ message: "User ID diperlukan" });

    const [exist] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (exist.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Cek username/email dipakai user lain
    const [conflict] = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, id]
    );

    if (conflict.length > 0) {
      return res.status(409).json({ message: "Username/email sudah digunakan" });
    }

    // Bangun query dinamis
    let query = "UPDATE users SET username = ?, email = ?";
    const params = [username, email];

    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      query += ", password = ?";
      params.push(hashed);
    }

    // 👉 TAMBAHAN: Perbarui foto jika ada upload
    if (foto) {
      query += ", foto = ?";
      params.push(foto);
    }

    query += " WHERE id = ?";
    params.push(id);

    await db.query(query, params);

    const [updated] = await db.query(
      "SELECT id, username, email, foto FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    const userData = updated[0];
    // Map foto to avatar for frontend consistency
    res.json({
      message: "Profile berhasil diperbarui",
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar: userData.foto || null
      },
      fotoBaru: foto || null
    });
    
  } catch (err) {
    console.error("❌ Error update profile:", err);
    res.status(500).json({ message: "Server error" });
  }
}

