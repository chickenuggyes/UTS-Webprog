import { db } from "../services/jsonDB.js";

export const itemsController = {
  // GET /items
  list(req, res) {
    const q = (req.query.q || "").toLowerCase();
    let items = db.readItems();
    if (q) {
      items = items.filter(
        it =>
          String(it.namaItem || "").toLowerCase().includes(q) ||
          String(it.keterangan || "").toLowerCase().includes(q)
      );
    }
    res.json({ count: items.length, items });
  },

  // POST /items
  create(req, res) {
    const items = db.readItems();
    const id = db.nextId(items);
    const { namaItem, quantity, keterangan, hargaSatuan, stok, foto } = req.body || {};

    if (!namaItem?.trim()) {
      return res.status(400).json({ message: "namaItem wajib diisi" });
    }

    const newItem = {
      id,
      namaItem: String(namaItem),
      quantity: String(quantity ?? ""),
      keterangan: String(keterangan ?? ""),
      hargaSatuan: Number(hargaSatuan) || 0,
      stok: Number(stok) || 0,
      foto: typeof foto === "string" && foto.startsWith("data:") ? foto : "" // simpan base64 kalau ada
    };

    items.push(newItem);
    db.writeItems(items);
    res.status(201).json(newItem);
  },

  // PUT /items/:id
  update(req, res) {
    const id = Number(req.params.id);
    const items = db.readItems();
    const idx = items.findIndex(it => Number(it.id) === id);
    if (idx === -1) return res.status(404).json({ message: "Item tidak ditemukan" });

    const p = req.body || {};
    const up = { ...items[idx] };

    if (p.namaItem !== undefined) up.namaItem = String(p.namaItem);
    if (p.quantity !== undefined) up.quantity = String(p.quantity);
    if (p.keterangan !== undefined) up.keterangan = String(p.keterangan);
    if (p.hargaSatuan !== undefined) {
      if (isNaN(Number(p.hargaSatuan)))
        return res.status(400).json({ message: "hargaSatuan harus angka" });
      up.hargaSatuan = Number(p.hargaSatuan);
    }
    if (p.stok !== undefined) {
      if (!Number.isInteger(Number(p.stok)))
        return res.status(400).json({ message: "stok harus bilangan bulat" });
      up.stok = Number(p.stok);
    }
    if (p.foto !== undefined) {
      // update foto kalau ada string dikirim
      up.foto = typeof p.foto === "string" && p.foto.startsWith("data:") ? p.foto : "";
    }

    items[idx] = up;
    db.writeItems(items);
    res.json(up);
  },

  // DELETE /items/:id
  remove(req, res) {
    const id = Number(req.params.id);
    const items = db.readItems();
    const idx = items.findIndex(it => Number(it.id) === id);
    if (idx === -1) return res.status(404).json({ message: "Item tidak ditemukan" });
    const [deleted] = items.splice(idx, 1);
    db.writeItems(items);
    res.json({ message: "Item dihapus", deleted });
  }
};
