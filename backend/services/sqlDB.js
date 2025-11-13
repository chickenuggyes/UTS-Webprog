import mysql from "mysql2/promise";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Ambil path environment dari file aiven.env
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../aiven.env") });

// ===========================
// ⚙️ Koneksi Database
// ===========================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00"
});

pool.on("connection", (conn) => {
  conn.query("SET time_zone = '+07:00'");
});

// Tes koneksi otomatis saat start
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database connected successfully");
    conn.release();
  } catch (err) {
    console.error("❌ Failed to connect to database:", err.message);
  }
})();

// ===========================
// 🧩 Service Helper Functions
// ===========================
export const dbService = {
  // ======== USERS ========
  async readUsers() {
    const [rows] = await pool.query("SELECT id, username, email FROM users");
    return rows;
  },

  async createUser({ username, email, password }) {
    const [result] = await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    return result.insertId;
  },

  async findUserByIdentifier(identifier) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier]
    );
    return rows[0] || null;
  },

  async findUserByUsername(username) {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0] || null;
  },

  // ======== PRODUCTS ========
  async readProduct() {
    const [rows] = await pool.query("SELECT * FROM products");
    return rows;
  },

  async upsertProduct(product) {
    await pool.query(
      `INSERT INTO products 
        (id, namaItem, catid, supid, keterangan, hargaSatuan, stok, foto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         namaItem = VALUES(namaItem),
         catid = VALUES(catid),
         supid = VALUES(supid),
         keterangan = VALUES(keterangan),
         hargaSatuan = VALUES(hargaSatuan),
         stok = VALUES(stok),
         foto = VALUES(foto)`,
      [
        product.id,
        product.namaItem,
        product.catid,
        product.supid,
        product.keterangan,
        product.hargaSatuan,
        product.stok,
        product.foto,
      ]
    );
  },

  // ======== NEXT AUTO ID ========
  async nextId(table, idColumn = "id") {
    const [rows] = await pool.query(
      `SELECT MAX(${idColumn}) AS maxId FROM ${table}`
    );
    return (rows[0].maxId || 0) + 1;
  },
};

// ===========================
// ✅ Export koneksi pool utama
// ===========================
export const db = pool;
export default pool;
