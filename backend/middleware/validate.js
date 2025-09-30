export function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === "");
    if (missing.length) {
      return res.status(400).json({ message: `Field wajib: ${missing.join(", ")}` });
    }
    next();
  };
}

export function validateItem(req, res, next) {
  const { namaItem, quantity, keterangan, hargaSatuan, stok } = req.body;
  if (typeof namaItem !== "string" || !namaItem.trim()) {
    return res.status(400).json({ message: "Nama Item tidak boleh kosong" });
  }
  if (typeof quantity !== "string" || !quantity.trim()) {
    return res.status(400).json({ message: "Contoh '1' atau '10'" });
  }
  if (typeof keterangan !== "string") {
    return res.status(400).json({ message: "Keterangan misalnya 80 ml/200 gr" });
  }
  if (isNaN(Number(hargaSatuan)) || Number(hargaSatuan) < 0) {
    return res.status(400).json({ message: "Harga Satuan harus angka >= 0" });
  }
  if (!Number.isInteger(Number(stok)) || Number(stok) < 0) {
    return res.status(400).json({ message: "Stok harus bilangan bulat >= 0" });
  }
  next();
}
