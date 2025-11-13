import express from "express";
import pool from "../services/sqlDB.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

function genId(prefix) {
  return prefix + uuidv4().slice(0, 5).toUpperCase();
}

/* ========================================================
   📦 STOCK IN  → tambah stok & catat transaksi
======================================================== */
router.post("/in", async (req, res) => {
  const { supplier_id, note, rows, user_id } = req.body;
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const tranid = genId("TIN");
    await conn.query(
      "INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type, note) VALUES (?, ?, ?, 'IN', ?)",
      [tranid, user_id || null, supplier_id || null, note || ""]
    );

    for (const r of rows) {
      const detailId = genId("TD");

      // Ambil harga satuan produk
      const [prodRes] = await conn.query(
        "SELECT hargaSatuan FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;

      // Simpan detail transaksi
      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );
      // NOTE: stok akan otomatis naik via trigger trg_increase_stock
    }

    await conn.commit();
    res.json({ message: "Transaksi IN berhasil", tranid });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error transaksi IN:", err);
    res.status(500).json({ message: "Gagal menyimpan transaksi IN" });
  } finally {
    conn.release();
  }
});

/* ========================================================
   📤 STOCK OUT  → kurangi stok & catat transaksi
======================================================== */
router.post("/out", async (req, res) => {
  const { note, rows, user_id } = req.body;
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const tranid = genId("TOUT");
    await conn.query(
      "INSERT INTO transactions (tranid, user_id, transaction_type, note) VALUES (?, ?, 'OUT', ?)",
      [tranid, user_id || null, note || ""]
    );

    for (const r of rows) {
      const detailId = genId("TD");

      // Ambil harga satuan produk
      const [prodRes] = await conn.query(
        "SELECT hargaSatuan FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;

      // Simpan detail transaksi (stok otomatis berkurang via trigger)
      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );
    }

    await conn.commit();
    res.json({ message: "Transaksi OUT berhasil", tranid });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error transaksi OUT:", err);
    res.status(500).json({ message: "Gagal menyimpan transaksi OUT" });
  } finally {
    conn.release();
  }
});

/* ========================================================
   📊 GET Semua Transaksi (gabung detail)
======================================================== */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        t.tranid AS id,
        t.transaction_type AS tipe,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d %H:%i:%s') AS tanggal,
        t.note AS catatan,
        p.namaItem,
        td.quantity AS qty,
        s.namaSupplier AS supplier
      FROM transactions t
      JOIN transaction_details td ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      LEFT JOIN suppliers s ON t.supplier_id = s.supid
      ORDER BY t.transaction_date DESC
    `);

    res.json({ transactions: rows });
  } catch (err) {
    console.error("❌ Error ambil transaksi:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat transaksi" });
  }
});

export default router;
