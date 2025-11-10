import express from "express";
import { db } from "../services/sqlDB.js"; 

const app = express();
const PORT = 3000;

// ========================
// 📊 1. Summary Dashboard
// ========================
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const [[totalProduk]] = await db.query("SELECT COUNT(*) AS total FROM products");
    const [[totalKategori]] = await db.query("SELECT COUNT(*) AS total FROM categories");
    const [[totalSupplier]] = await db.query("SELECT COUNT(*) AS total FROM suppliers");
    const [[stokBarang]] = await db.query("SELECT SUM(stok) AS total FROM products");
    const [[totalHarga]] = await db.query("SELECT SUM(hargaSatuan * stok) AS total FROM products");
    const [[transaksiHariIni]] = await db.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE DATE(transaction_date) = CURDATE()"
    );
    const [barangHampirHabis] = await db.query(
      "SELECT id, namaItem, stok FROM products WHERE stok < 10 ORDER BY stok ASC LIMIT 5"
    );

    res.json({
      totalProduk: totalProduk.total || 0,
      totalKategori: totalKategori.total || 0,
      totalSupplier: totalSupplier.total || 0,
      stokBarang: stokBarang.total || 0,
      totalHarga: totalHarga.total || 0,
      transaksiHariIni: transaksiHariIni.total || 0,
      barangHampirHabis,
    });
  } catch (err) {
    console.error("❌ Error getDashboardSummary:", err);
    res.status(500).json({ message: "Gagal memuat summary dashboard" });
  }
});

// ==================================
// 📈 2. Grafik Transaksi per Minggu
// ==================================
app.get("/api/dashboard/weekly-transactions", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        WEEK(transaction_date) AS minggu,
        COUNT(*) AS jumlahTransaksi
      FROM transactions
      WHERE YEAR(transaction_date) = YEAR(CURDATE())
      GROUP BY WEEK(transaction_date)
      ORDER BY minggu ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error getWeeklyTransactions:", err);
    res.status(500).json({ message: "Gagal memuat grafik transaksi mingguan" });
  }
});

// ===================================================
// 📊 3. Barang paling banyak keluar / masuk (grafik)
// ===================================================
app.get("/api/dashboard/top-items", async (req, res) => {
  try {
    const [barangOut] = await db.query(`
      SELECT p.namaItem, SUM(td.quantity) AS total
      FROM transaction_details td
      JOIN transactions t ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      WHERE t.transaction_type = 'OUT'
      GROUP BY p.id
      ORDER BY total DESC
      LIMIT 5
    `);

    const [barangIn] = await db.query(`
      SELECT p.namaItem, SUM(td.quantity) AS total
      FROM transaction_details td
      JOIN transactions t ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      WHERE t.transaction_type = 'IN'
      GROUP BY p.id
      ORDER BY total DESC
      LIMIT 5
    `);

    res.json({ barangOut, barangIn });
  } catch (err) {
    console.error("❌ Error getTopItems:", err);
    res.status(500).json({ message: "Gagal memuat data top items" });
  }
});

// ============================================
// 🚨 4. Notifikasi stok rendah (stok < 5)
// ============================================
app.get("/api/dashboard/low-stock", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, namaItem, stok FROM products WHERE stok < 5 ORDER BY stok ASC"
    );
    if (rows.length > 0) {
      res.json({
        alert: true,
        message: "Beberapa barang hampir habis, segera minta supply!",
        items: rows,
      });
    } else {
      res.json({ alert: false });
    }
  } catch (err) {
    console.error("❌ Error getLowStockAlert:", err);
    res.status(500).json({ message: "Gagal memuat notifikasi stok rendah" });
  }
});

// ==========================
// 🔗 Jalankan server langsung
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Dashboard API jalan di http://localhost:${PORT}`);
});
