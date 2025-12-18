import pool from "../services/sqlDB.js";
import { v4 as uuid } from "uuid";

export const transactionController = {

  /* ============================================================
      CREATE TRANSACTION IN
  ============================================================ */
  async createIn(req, res) {
    console.log("===== REQUEST BODY CREATE IN =====");
    console.log(req.body);

    const { rows, user_id, supplier_id } = req.body;

    if (!user_id || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "Data transaksi tidak lengkap" });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [[lastTran]] = await conn.query(`
        SELECT tranid 
        FROM transactions
        ORDER BY tranid DESC
        LIMIT 1
      `);

      const generateTransactionId = (lastId) => {
        if (!lastId) return "T001";
        const num = parseInt(lastId.substring(1)) + 1;
        return "T" + num.toString().padStart(3, "0");
      };

      const tranid = generateTransactionId(lastTran?.tranid);

      // INSERT HEADER
      await conn.query(
        `INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type)
         VALUES (?, ?, ?, ?)`,
        [tranid, user_id, supplier_id, "IN"]
      );

      const [[lastDetail]] = await conn.query(`
        SELECT id 
        FROM transaction_details
        ORDER BY id DESC
        LIMIT 1
      `);

      const generateDetailId = (lastId) => {
        if (!lastId) return "TD001";
        const num = parseInt(lastId.substring(2)) + 1;
        return "TD" + num.toString().padStart(3, "0");
      };

      let currentDetailId = lastDetail?.id;

      // INSERT DETAIL + UPDATE STOK
      for (const row of rows) {
        const itemId = row.itemId || row.product_id;
        const qty = row.qty || row.quantity;
        const note = row.note || null;

        if (!itemId || !qty) continue;

        const [productRows] = await conn.query(
          "SELECT hargaSatuan, stok FROM products WHERE id = ? FOR UPDATE",
          [itemId]
        );

        if (productRows.length === 0) {
          throw new Error(`Produk ${itemId} tidak ditemukan`);
        }

        const hargaSatuan = productRows[0].hargaSatuan || 0;

        currentDetailId = generateDetailId(currentDetailId);

        await conn.query(
          `INSERT INTO transaction_details
           (id, transaction_id, product_id, quantity, hargaSatuan, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [currentDetailId, tranid, itemId, qty, hargaSatuan, note]
        );

        await conn.query(
          "UPDATE products SET stok = ? WHERE id = ?",
          [productRows[0].stok + qty, itemId]
        );

        const logid = uuid();
        await conn.query(
          `INSERT INTO stocklog (stokid, product_id, change_type, quantity, transaction_id)
           VALUES (?, ?, ?, ?, ?)`,
          [logid, itemId, "IN", qty, tranid]
        );
      }

      await conn.commit();
      conn.release();
      return res.json({ message: "Transaksi IN berhasil disimpan", tranid });

    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("TRANSACTION IN ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ============================================================
      CREATE TRANSACTION OUT
  ============================================================ */
  async createOut(req, res) {
    const { rows, user_id } = req.body;

    if (!user_id || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "Data transaksi tidak lengkap" });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [[lastTran]] = await conn.query(`
        SELECT tranid 
        FROM transactions
        ORDER BY tranid DESC
        LIMIT 1
      `);

      const generateTransactionId = (lastId) => {
        if (!lastId) return "T001";
        const num = parseInt(lastId.substring(1)) + 1;
        return "T" + num.toString().padStart(3, "0");
      };

      const tranid = generateTransactionId(lastTran?.tranid);

      await conn.query(
        `INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type)
         VALUES (?, ?, ?, ?)`,
        [tranid, user_id, null, "OUT"]
      );

      const [[lastDetail]] = await conn.query(`
        SELECT id 
        FROM transaction_details
        ORDER BY id DESC
        LIMIT 1
      `);

      const generateDetailId = (lastId) => {
        if (!lastId) return "TD001";
        const num = parseInt(lastId.substring(2)) + 1;
        return "TD" + num.toString().padStart(3, "0");
      };

      let currentDetailId = lastDetail?.id;

      for (const row of rows) {
        const itemId = row.itemId || row.product_id;
        const qty = row.qty || row.quantity;
        const note = row.note || null;

        if (!itemId || !qty) continue;

        const [productRows] = await conn.query(
          "SELECT hargaSatuan, stok FROM products WHERE id = ? FOR UPDATE",
          [itemId]
        );

        if (productRows.length === 0) {
          throw new Error(`Produk ${itemId} tidak ditemukan`);
        }

        if (productRows[0].stok < qty) {
          throw new Error(
            `Stok produk ${itemId} tidak cukup. Stok: ${productRows[0].stok}, butuh: ${qty}`
          );
        }

        const hargaSatuan = productRows[0].hargaSatuan || 0;

        currentDetailId = generateDetailId(currentDetailId);

        await conn.query(
          `INSERT INTO transaction_details 
           (id, transaction_id, product_id, quantity, hargaSatuan, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [currentDetailId, tranid, itemId, qty, hargaSatuan, note]
        );

        await conn.query(
          "UPDATE products SET stok = ? WHERE id = ?",
          [productRows[0].stok - qty, itemId]
        );

        const logid = uuid();
        await conn.query(
          `INSERT INTO stocklog (stokid, product_id, change_type, quantity, transaction_id)
           VALUES (?, ?, ?, ?, ?)`,
          [logid, itemId, "OUT", qty, tranid]
        );
      }

      await conn.commit();
      conn.release();
      return res.json({ message: "Transaksi OUT berhasil disimpan", tranid });

    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("TRANSACTION OUT ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ============================================================
      GET ALL TRANSACTIONS (FIXED)
  ============================================================ */
  async getAllTransactions(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          sl.stokid,
          sl.product_id,
          sl.change_type AS tipe,
          sl.quantity AS qty,
          sl.transaction_id AS transaksiId,
          COALESCE(t.transaction_date, NOW()) AS tanggal,
          t.user_id,
          t.supplier_id,
          t.transaction_type AS type,
          p.namaItem,
          p.hargaSatuan,
          
          -- FIX: harus username, bukan ID - join dengan id user karena t.user_id adalah ID
          u.username AS akun,

          s.namaSupplier,
          td.note AS catatan
        FROM stocklog sl
        LEFT JOIN transactions t ON t.tranid = sl.transaction_id
        LEFT JOIN products p ON p.id = sl.product_id
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN suppliers s ON s.supid = t.supplier_id
        LEFT JOIN transaction_details td 
          ON td.transaction_id = sl.transaction_id 
         AND td.product_id = sl.product_id
        ORDER BY COALESCE(t.transaction_date, NOW()) DESC, sl.stokid DESC
      `);

      const transactions = rows.map((row) => ({
        transaksiId: row.transaksiId,
        id: row.transaksiId,
        tranid: row.transaksiId,
        tanggal: new Date(row.tanggal).toLocaleDateString("id-ID"),
        type: row.type,
        tipe: row.tipe,
        product_id: row.product_id,
        namaItem: row.namaItem,
        qty: row.qty,
        hargaSatuan: row.hargaSatuan,
        user_id: row.user_id,
        username: row.akun, 
        supplier_id: row.supplier_id,
        namaSupplier: row.namaSupplier,
        catatan: row.catatan,
      }));

      res.json({ transactions });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Gagal mengambil data transaksi" });
    }
  },

  /* ============================================================ */
  async getTodayTransactions(req, res) {
    try {
      const [[result]] = await pool.query(`
        SELECT COUNT(*) AS total 
        FROM transactions 
        WHERE DATE(transaction_date) = CURDATE()
      `);
      res.json({ total: result.total });
    } catch (err) {
      res.status(500).json({ message: "Error fetching today's transactions" });
    }
  },

  /* ============================================================ */
  async summary(req, res) {
    try {
      const [[result]] = await pool.query(`
        SELECT 
          SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pemasukan,
          SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pengeluaran
        FROM transaction_details td
        JOIN transactions t ON t.tranid = td.transaction_id
      `);

      res.json({
        pemasukan: result.pemasukan || 0,
        pengeluaran: result.pengeluaran || 0,
        profit: (result.pemasukan || 0) - (result.pengeluaran || 0),
      });

    } catch (err) {
      res.status(500).json({ message: "Gagal fetch summary" });
    }
  },

  /* ============================================================ */
  async summaryToday(req, res) {
    try {
      const [[result]] = await pool.query(`
        SELECT 
          SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pemasukan,
          SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pengeluaran
        FROM transaction_details td
        JOIN transactions t ON t.tranid = td.transaction_id
        WHERE DATE(t.transaction_date) = CURDATE()
      `);

      res.json({
        pemasukan: result.pemasukan || 0,
        pengeluaran: result.pengeluaran || 0,
        profit: (result.pemasukan || 0) - (result.pengeluaran || 0),
      });

    } catch (err) {
      res.status(500).json({ message: "Gagal fetch summary hari ini" });
    }
  },

  /* ============================================================ */
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
