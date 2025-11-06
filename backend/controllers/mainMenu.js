import { db } from "../services/sqlDB.js";

export const itemsController = {
  // GET /items?q=keyword
  async list(req, res) {
    try {
      const q = (req.query.q || "").toLowerCase();
      let sql = "SELECT * FROM products";
      let params = [];

      if (q) {
        sql += " WHERE LOWER(namaItem) LIKE ? OR LOWER(keterangan) LIKE ?";
        params = [`%${q}%`, `%${q}%`];
      }

      const [rows] = await db.query(sql, params);
      res.json({ count: rows.length, items: rows });
    } catch (err) {
      console.error("List items error:", err);
      res.status(500).json({ message: "Gagal mengambil data item" });
    }
  },

  // POST /items  (multipart/form-data; field file = "foto")
  async create(req, res) {
    try {
      const {
        namaItem = "",
        keterangan = "",
        hargaSatuan = 0,
        stok = 0,
      } = req.body || {};

      if (!String(namaItem).trim()) {
        return res.status(400).json({ message: "namaItem wajib diisi" });
      }

      const harga = Number(hargaSatuan);
      const stokNum = Number(stok);
      if (Number.isNaN(harga) || harga < 0) {
        return res.status(400).json({ message: "hargaSatuan harus angka ≥ 0" });
      }
      if (!Number.isInteger(stokNum) || stokNum < 0) {
        return res.status(400).json({ message: "stok harus bilangan bulat ≥ 0" });
      }

      const foto = req.file ? `/uploads/${req.file.filename}` : "";

      const [result] = await db.query(
        `INSERT INTO items (namaItem, keterangan, hargaSatuan, stok, foto)
         VALUES (?, ?, ?, ?, ?)`,
        [namaItem, keterangan, harga, stokNum, foto]
      );

      const insertedId = result.insertId;

      const [rows] = await db.query("SELECT * FROM items WHERE id = ?", [insertedId]);
      return res.status(201).json(rows[0]);
    } catch (e) {
      console.error("Create item error:", e);
      return res.status(500).json({ message: e.message || "Gagal menambah produk" });
    }
  },

  // PUT /items/:id  (boleh multipart untuk ganti foto)
  async update(req, res) {
    try {
      const id = Number(req.params.id);

      const [rows] = await db.query("SELECT * FROM items WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Item tidak ditemukan" });
      }

      const current = rows[0];
      const p = req.body || {};

      let namaItem = p.namaItem ?? current.namaItem;
      let keterangan = p.keterangan ?? current.keterangan;
      let hargaSatuan = p.hargaSatuan ?? current.hargaSatuan;
      let stok = p.stok ?? current.stok;
      let foto = current.foto;

      if (req.file) foto = `/uploads/${req.file.filename}`;
      if (p.foto === "") foto = "";

      // validasi angka
      const hargaNum = Number(hargaSatuan);
      const stokNum = Number(stok);
      if (Number.isNaN(hargaNum) || hargaNum < 0) {
        return res.status(400).json({ message: "hargaSatuan harus angka ≥ 0" });
      }
      if (!Number.isInteger(stokNum) || stokNum < 0) {
        return res.status(400).json({ message: "stok harus bilangan bulat ≥ 0" });
      }

      await db.query(
        `UPDATE items 
         SET namaItem=?, keterangan=?, hargaSatuan=?, stok=?, foto=?
         WHERE id=?`,
        [namaItem, keterangan, hargaNum, stokNum, foto, id]
      );

      const [updated] = await db.query("SELECT * FROM items WHERE id = ?", [id]);
      return res.json(updated[0]);
    } catch (e) {
      console.error("Update item error:", e);
      return res.status(500).json({ message: e.message || "Gagal mengubah produk" });
    }
  },

  // DELETE /items/:id
  async remove(req, res) {
    try {
      const id = Number(req.params.id);

      const [rows] = await db.query("SELECT * FROM items WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Item tidak ditemukan" });
      }

      const deleted = rows[0];
      await db.query("DELETE FROM items WHERE id = ?", [id]);

      res.json({ message: "Item dihapus", deleted });
    } catch (e) {
      console.error("Delete item error:", e);
      res.status(500).json({ message: e.message || "Gagal menghapus produk" });
    }
  },
};