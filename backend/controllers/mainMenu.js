import { db } from "../services/jsonDB.js";

export const itemsController = {
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

  async create(req, res) {
    try {
      const items = db.readItems();
      const id = db.nextId(items);

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

      const newItem = {
        id,
        namaItem: String(namaItem),
        keterangan: String(keterangan),
        hargaSatuan: harga,
        stok: stokNum,
        foto,
      };

      items.push(newItem);
      db.writeItems(items);

      return res.status(201).json(newItem);
    } catch (e) {
      console.error("Create item error:", e);
      return res.status(500).json({ message: e.message || "Gagal menambah produk" });
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const items = db.readItems();
      const idx = items.findIndex((it) => Number(it.id) === id);
      if (idx === -1) return res.status(404).json({ message: "Item tidak ditemukan" });

      const p = req.body || {};
      const up = { ...items[idx] };

      if (p.namaItem !== undefined) up.namaItem = String(p.namaItem);
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

      if (req.file) up.foto = `/uploads/${req.file.filename}`;
     
      if (p.foto === "") up.foto = "";

      items[idx] = up;
      db.writeItems(items);
      return res.json(up);
    } catch (e) {
      console.error("Update item error:", e);
      return res.status(500).json({ message: e.message || "Gagal mengubah produk" });
    }
  },

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
