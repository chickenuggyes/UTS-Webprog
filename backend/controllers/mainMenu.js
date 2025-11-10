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
      console.error("List products error:", err);
      res.status(500).json({ message: "Gagal mengambil data produk" });
    }
  },

  // POST /items (multipart/form-data; field file = "foto")
  async create(req, res) {
    try {
      const {
        id = "",
        namaItem = "",
        catid = null,
        supid = null,
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

      // generate ID manual (misal P001, P002, dst)
      const [last] = await db.query(
        "SELECT id FROM products ORDER BY id DESC LIMIT 1"
      );
      let newId = "P001";
      if (last.length > 0) {
        const lastNum = parseInt(last[0].id.slice(1)) + 1;
        newId = "P" + String(lastNum).padStart(3, "0");
      }

      const foto = req.file ? `/uploads/${req.file.filename}` : null;

      await db.query(
        `INSERT INTO products 
        (id, namaItem, catid, supid, keterangan, hargaSatuan, stok, foto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, namaItem, catid, supid, keterangan, harga, stokNum, foto]
      );

      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [newId]);
      return res.status(201).json(rows[0]);
    } catch (e) {
      console.error("Create product error:", e);
      return res.status(500).json({ message: e.message || "Gagal menambah produk" });
    }
  },

  // PUT /items/:id
  async update(req, res) {
    try {
      const id = req.params.id; // VARCHAR(10)

      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Produk tidak ditemukan" });
      }

      const current = rows[0];
      const p = req.body || {};

      let namaItem = p.namaItem ?? current.namaItem;
      let catid = p.catid ?? current.catid;
      let supid = p.supid ?? current.supid;
      let keterangan = p.keterangan ?? current.keterangan;
      let hargaSatuan = p.hargaSatuan ?? current.hargaSatuan;
      let stok = p.stok ?? current.stok;
      let foto = current.foto;

      if (req.file) foto = `/uploads/${req.file.filename}`;
      if (p.foto === "") foto = null;

      const hargaNum = Number(hargaSatuan);
      const stokNum = Number(stok);
      if (Number.isNaN(hargaNum) || hargaNum < 0) {
        return res.status(400).json({ message: "hargaSatuan harus angka ≥ 0" });
      }
      if (!Number.isInteger(stokNum) || stokNum < 0) {
        return res.status(400).json({ message: "stok harus bilangan bulat ≥ 0" });
      }

      await db.query(
        `UPDATE products 
         SET namaItem=?, catid=?, supid=?, keterangan=?, hargaSatuan=?, stok=?, foto=? 
         WHERE id=?`,
        [namaItem, catid, supid, keterangan, hargaNum, stokNum, foto, id]
      );

      const [updated] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
      return res.json(updated[0]);
    } catch (e) {
      console.error("Update product error:", e);
      return res.status(500).json({ message: e.message || "Gagal mengubah produk" });
    }
  },

  // DELETE /items/:id
  async remove(req, res) {
    try {
      const id = req.params.id;

      const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Produk tidak ditemukan" });
      }

      const deleted = rows[0];
      await db.query("DELETE FROM products WHERE id = ?", [id]);

      res.json({ message: "Produk dihapus", deleted });
    } catch (e) {
      console.error("Delete product error:", e);
      res.status(500).json({ message: e.message || "Gagal menghapus produk" });
    }
  },
};
