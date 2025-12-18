import pool from "../services/sqlDB.js";

// alias biar singkat
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

      // 🔍 Ambil supid terbesar dari DB
      const [maxRow] = await db.query(`
        SELECT MAX(CAST(SUBSTRING(supid, 2) AS UNSIGNED)) AS maxId
        FROM suppliers
      `);

      const maxId = maxRow[0].maxId || 0;   // jika belum ada data → 0
      const nextNum = maxId + 1;            // contoh: 12 → 13
      const nextSupid = "S" + String(nextNum).padStart(3, "0"); // jadi S013

      // 💾 Insert data supplier baru
      await db.query(
        `INSERT INTO suppliers (supid, namaSupplier, kontak, alamat)
         VALUES (?, ?, ?, ?)`,
        [nextSupid, namaSupplier.trim(), kontak || null, alamat || null]
      );

      // 📌 Ambil data supplier yang baru ditambahkan
      const [newSupplier] = await db.query(
        `SELECT supid, namaSupplier, kontak, alamat
         FROM suppliers
         WHERE supid = ?`,
        [nextSupid]
      );

      res.status(201).json({ supplier: newSupplier[0] });

    } catch (err) {
      console.error("Error create supplier:", err);
      res.status(500).json({ message: "Gagal menambah supplier" });
    }
  },

};
