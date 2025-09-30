import { db } from "../services/jsonDB.js";

// /dashboard → ringkasan total
export function dashboard(req, res) {
  const items = db.readItems();
  const totalItem  = items.length;
  const totalStok  = items.reduce((a, it) => a + Number(it.stok || 0), 0);
  const totalHarga = items.reduce((a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0), 0);
  res.json({ totalItem, totalStok, totalHarga });
}

// /report → daftar + filter (untuk tabel bawah di halaman dashboard)
export function report(req, res) {
  const q = (req.query.q || "").toLowerCase();
  const minHarga = Number(req.query.minHarga || 0);
  const maxHarga = Number(req.query.maxHarga || Number.MAX_SAFE_INTEGER);

  let items = db.readItems();
  if (q) {
    items = items.filter(it =>
      String(it.namaItem || "").toLowerCase().includes(q) ||
      String(it.keterangan || "").toLowerCase().includes(q)
    );
  }
  items = items.filter(it => Number(it.hargaSatuan) >= minHarga && Number(it.hargaSatuan) <= maxHarga);
  res.json({ count: items.length, items });
}
