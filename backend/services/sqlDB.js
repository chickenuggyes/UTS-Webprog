import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: "../aiven.env" }); // karena file di dalam /services

// --- Koneksi Pool (efisien & async)
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- Tes koneksi otomatis saat start
(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ Database connected successfully");
    conn.release();
  } catch (err) {
    console.error("❌ Failed to connect to database:", err.message);
  }
})();

// ===========================
// 🔧 Service Helper Functions
// ===========================
export const dbService = {
  // ========== USERS ==========
  async readUsers() {
    const [rows] = await db.query("SELECT * FROM users");
    return rows;
  },

  async writeUsers(data) {
    await db.query("DELETE FROM users");
    for (const user of data) {
      await db.query(
        "INSERT INTO users (id, username, password) VALUES (?, ?, ?)",
        [user.id, user.username, user.password]
      );
    }
  },

  // ========== ITEMS ==========
  async readItems() {
    const [rows] = await db.query("SELECT * FROM products");
    return rows;
  },

  async writeItems(data) {
    await db.query("DELETE FROM products");
    for (const item of data) {
      await db.query(
        `INSERT INTO items (id, namaItem, keterangan, hargaSatuan, stok)
         VALUES (?, ?, ?, ?, ?)`,
        [item.id, item.namaItem, item.keterangan, item.hargaSatuan, item.stok]
      );
    }
  },

  // ========== NEXT ID AUTO ==========
  async nextId(table, idColumn = "id") {
    const [rows] = await db.query(
      `SELECT MAX(${idColumn}) AS maxId FROM ${table}`
    );
    return (rows[0].maxId || 0) + 1;
  },
};
