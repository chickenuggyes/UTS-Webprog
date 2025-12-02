import pool from "../services/sqlDB.js";
import { v4 as uuid } from "uuid";

export const transactionController = {

  /* ============================================================
      CREATE TRANSACTION
  ============================================================ */
  async create(req, res) {
    const { user_id, supplier_id, transaction_type, note, items } = req.body;

    if (!user_id || !transaction_type || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Data transaksi tidak lengkap" });
    }

    if (!["IN", "OUT"].includes(transaction_type)) {
      return res.status(400).json({ message: "transaction_type harus IN atau OUT" });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const tranid = "T" + uuid().slice(0, 8).toUpperCase();

      await conn.query(
        `INSERT INTO transactions 
          (tranid, user_id, supplier_id, transaction_type, note)
         VALUES (?, ?, ?, ?, ?)`,
        [tranid, user_id, supplier_id || null, transaction_type, note || null]
      );

      for (const item of items) {
        const detailId = "D" + uuid().slice(0, 8).toUpperCase();

        await conn.query(
          `INSERT INTO transaction_details
           (id, transaction_id, product_id, quantity, hargaSatuan)
           VALUES (?, ?, ?, ?, ?)`,
          [detailId, tranid, item.product_id, item.quantity, item.hargaSatuan]
        );

        const [rows] = await conn.query(
          "SELECT stok FROM products WHERE id = ? FOR UPDATE",
          [item.product_id]
        );

        if (rows.length === 0) throw new Error(`Produk ${item.product_id} tidak ditemukan`);

        let newStok =
          transaction_type === "IN"
            ? rows[0].stok + item.quantity
            : rows[0].stok - item.quantity;

        if (transaction_type === "OUT" && rows[0].stok < item.quantity) {
          throw new Error(`Stok produk ${item.product_id} tidak mencukupi`);
        }

        await conn.query(
          "UPDATE products SET stok = ? WHERE id = ?",
          [newStok, item.product_id]
        );

        const logid = "L" + uuid().slice(0, 8).toUpperCase();
        await conn.query(
          `INSERT INTO stock_log
           (stokid, product_id, change_type, quantity, transaction_id)
           VALUES (?, ?, ?, ?, ?)`,
          [logid, item.product_id, transaction_type, item.quantity, tranid]
        );
      }

      await conn.commit();
      conn.release();

      return res.json({ message: "Transaksi berhasil disimpan", tranid });

    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("TRANSACTION ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  },


  /* ============================================================
      GET TODAY TRANSACTIONS (SUMMARY)
  ============================================================ */
  async getTodayTransactions(req, res) {
    try {
      const [[result]] = await pool.query(
        `SELECT COUNT(*) AS total 
         FROM transactions 
         WHERE DATE(transaction_date) = CURDATE()`
      );

      res.json({ total: result.total });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching today's transactions" });
    }
  },


  /* ============================================================
      DASHBOARD SUMMARY
  ============================================================ */
  async summary(req, res) {
    try {
      const [[result]] = await pool.query(`
        SELECT 
          SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pemasukan,
          SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pengeluaran
        FROM transaction_details td
        JOIN transactions t ON t.tranid = td.transaction_id
      `);

      const pemasukan = result.pemasukan || 0;
      const pengeluaran = result.pengeluaran || 0;
      const profit = pemasukan - pengeluaran;

      res.json({ pemasukan, pengeluaran, profit });

    } catch (err) {
      res.status(500).json({ message: "Gagal fetch summary" });
    }
  },


  /* ============================================================
      WEEKLY GRAPH
  ============================================================ */
  async weekly(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          DATE(t.transaction_date) AS tanggal,
          SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS total_in,
          SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS total_out
        FROM transactions t
        JOIN transaction_details td ON td.transaction_id = t.tranid
        WHERE t.transaction_date >= DATE(NOW()) - INTERVAL 7 DAY
        GROUP BY DATE(t.transaction_date)
        ORDER BY tanggal ASC
      `);

      res.json({ weekly: rows });
    } catch (err) {
      res.status(500).json({ message: "Gagal mengambil grafik mingguan" });
    }
  }

};
