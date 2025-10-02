import { db } from "../services/jsonDB.js";

export const itemsController = {
  // GET /items?q=keyword
  list(req, res) {
    const q = (req.query.q || "").toLowerCase();
    let items = db.readItems();

    if (q) {
      items = items.filter((it) =>
        [it.namaItem, it.keterangan]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }

    res.json({ count: items.length, items });
  },

  // POST /items  (multipart/form-data; field file = "foto")
  async create(req, res) {
    try {
      const items = db.readItems();
      const id = db.nextId(items);

      const {
        namaItem = "",
        quantity = "",
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

      // multer isi req.file jika ada upload
      const foto = req.file ? `/uploads/${req.file.filename}` : "";

      const newItem = {
        id,
        namaItem: String(namaItem),
        quantity: String(quantity),
        keterangan: String(keterangan),
        hargaSatuan: harga,
        stok: stokNum,
        foto, // "" jika tanpa upload
      };

      items.push(newItem);
      db.writeItems(items);

      return res.status(201).json(newItem);
    } catch (e) {
      console.error("Create item error:", e);
      return res.status(500).json({ message: e.message || "Gagal menambah produk" });
    }
  },

  // PUT /items/:id  (boleh multipart untuk ganti foto)
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const items = db.readItems();
      const idx = items.findIndex((it) => Number(it.id) === id);
      if (idx === -1) return res.status(404).json({ message: "Item tidak ditemukan" });

      const p = req.body || {};
      const up = { ...items[idx] };

      if (p.namaItem !== undefined) up.namaItem = String(p.namaItem);
      if (p.quantity !== undefined) up.quantity = String(p.quantity);
      if (p.keterangan !== undefined) up.keterangan = String(p.keterangan);

      if (p.hargaSatuan !== undefined) {
        const h = Number(p.hargaSatuan);
        if (Number.isNaN(h) || h < 0)
          return res.status(400).json({ message: "hargaSatuan harus angka ≥ 0" });
        up.hargaSatuan = h;
      }

      if (p.stok !== undefined) {
        const s = Number(p.stok);
        if (!Number.isInteger(s) || s < 0)
          return res.status(400).json({ message: "stok harus bilangan bulat ≥ 0" });
        up.stok = s;
      }

      // ganti foto jika ada file baru
      if (req.file) up.foto = `/uploads/${req.file.filename}`;
      // hapus foto jika eksplisit kirim foto=""
      if (p.foto === "") up.foto = "";

      items[idx] = up;
      db.writeItems(items);
      return res.json(up);
    } catch (e) {
      console.error("Update item error:", e);
      return res.status(500).json({ message: e.message || "Gagal mengubah produk" });
    }
  },

  // DELETE /items/:id
  remove(req, res) {
    const id = Number(req.params.id);
    const items = db.readItems();
    const idx = items.findIndex((it) => Number(it.id) === id);
    if (idx === -1) return res.status(404).json({ message: "Item tidak ditemukan" });

    const [deleted] = items.splice(idx, 1);
    db.writeItems(items);
    res.json({ message: "Item dihapus", deleted });
  },
};
