import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;

function loadData() {
  const raw = fs.readFileSync(path.join(process.cwd(), "backend", "data.json"));
  return JSON.parse(raw);
}

app.get("/dashboard", (req, res) => {
  const items = loadData();

  const totalProduk = items.length;
  const totalStok = items.reduce((sum, item) => sum + (item.stok || 0), 0);
  const hargaTotal = items.reduce(
    (sum, item) => sum + ((item.hargaSatuan || 0) * (item.stok || 0)),
    0
  );

  res.json({
    totalProduk,
    totalStok,
    hargaTotal,
    items // <---- kirim juga list produk supaya frontend bisa render gambar
  });
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});