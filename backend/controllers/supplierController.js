import pool, { dbService } from "../services/sqlDB.js";

// pakai alias db biar singkat
const db = pool;

export const supplierController = {
  // GET semua supplier
  getAll: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT supid, namaSupplier, kontak, alamat
        FROM suppliers
        ORDER BY supid ASC
      `);

      res.json({ suppliers: rows });
    } catch (err) {
      console.error("Error getAll suppliers:", err);
      res.status(500).json({ message: "Gagal mengambil data supplier" });
    }
  },

  // POST /suppliers - tambah supplier baru
  create: async (req, res) => {
    try {
      const { namaSupplier, kontak, alamat } = req.body;

      if (!namaSupplier || !namaSupplier.trim()) {
        return res.status(400).json({ message: "Nama supplier wajib diisi" });
      }

// jika nextSupid sekarang mengembalikan "S012"
const raw = await dbService.nextId("suppliers", "supid"); // mis: "S012"
const numeric = parseInt(String(raw).replace(/\D/g, ''), 10) || 0; // 12
const nextNum = numeric + 1; // 13
const nextSupid = 'S' + String(nextNum).padStart(3, '0'); // "S013"

      // 💾 Insert ke DB, termasuk supid
      const [result] = await db.query(
        `INSERT INTO suppliers (supid, namaSupplier, kontak, alamat)
         VALUES (?, ?, ?, ?)`,
        [nextSupid, namaSupplier.trim(), kontak || null, alamat || null]
      );

      // Ambil kembali row yang baru diinsert
      const [rows] = await db.query(
        `SELECT supid, namaSupplier, kontak, alamat
         FROM suppliers
         WHERE supid = ?`,
        [nextSupid]
      );

      res.status(201).json({ supplier: rows[0] });
    } catch (err) {
      console.error("Error create supplier:", err);
      res.status(500).json({ message: "Gagal menambah supplier" });
    }
  },
};
