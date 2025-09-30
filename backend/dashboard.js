const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

function loadData() {
  const raw = fs.readFileSync('data.json');
  return JSON.parse(raw);
}

app.get('/dashboard', (req, res) => {
  const data = loadData();

  const totalProduk = data.length;

  const totalStok = data.reduce((sum, item) => sum + item.stok, 0);

  const hargaTotal = data.reduce(
    (sum, item) => sum + (item.hargaSatuan * item.stok),
    0
  );

  res.json({
    totalProduk,
    totalStok,
    hargaTotal
  });
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
