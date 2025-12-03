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
          (tranid, user_id, supplier_id, transaction_type)
         VALUES (?, ?, ?, ?)`,
        [tranid, user_id, supplier_id || null, transaction_type || null]
      );

      for (const item of items) {
        const detailId = "D" + uuid().slice(0, 8).toUpperCase();

        await conn.query(
          `INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan, note)
          VALUES (?,?,?,?,?,?)`,
          [detailId, tranid, item.product_id, item.quantity, item.hargaSatuan, item.note]
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
          `INSERT INTO stocklog
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
      CREATE TRANSACTION IN (dari format frontend)
  ============================================================ */
async createIn(req, res) {
  const { rows, user_id, supplier_id } = req.body;

  if (!user_id || !rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: "Data transaksi tidak lengkap" });
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // ================================
    // GET LAST TRANSACTION ID
    // ================================
    const [[lastTran]] = await conn.query(`
      SELECT tranid 
      FROM transactions
      ORDER BY tranid DESC
      LIMIT 1
    `);

    function generateTransactionId(lastId) {
      if (!lastId) return "T001";
      const num = parseInt(lastId.substring(1)) + 1;
      return "T" + num.toString().padStart(3, "0");
    }

    const tranid = generateTransactionId(lastTran?.tranid);

    // INSERT TRANSACTION HEADER
    await conn.query(
      `INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type)
       VALUES (?, ?, ?, ?)`,
      [tranid, user_id, supplier_id || null, "IN"]
    );

    // ================================
    // GET LAST DETAIL ID
    // ================================
    const [[lastDetail]] = await conn.query(`
      SELECT id 
      FROM transaction_details
      ORDER BY id DESC
      LIMIT 1
    `);

    function generateTransactionDetailId(lastId) {
      if (!lastId) return "TD001";
      const num = parseInt(lastId.substring(2)) + 1;
      return "TD" + num.toString().padStart(3, "0");
    }

    let currentDetailId = lastDetail?.id;

    // ================================
    // INSERT EACH DETAIL ROW
    // ================================
    for (const row of rows) {
      const itemId = row.itemId || row.product_id;
      const qty = row.qty || row.quantity;
      const note = row.note || null;

      if (!itemId || !qty) continue;

      // LOCK PRODUCT ROW
      const [productRows] = await conn.query(
        "SELECT hargaSatuan, stok FROM products WHERE id = ? FOR UPDATE",
        [itemId]
      );

      if (productRows.length === 0) {
        throw new Error(`Produk ${itemId} tidak ditemukan`);
      }

      const hargaSatuan = productRows[0].hargaSatuan || 0;

      // GENERATE DETAIL ID
      currentDetailId = generateTransactionDetailId(currentDetailId);

      await conn.query(
        `INSERT INTO transaction_details
         (id, transaction_id, product_id, quantity, hargaSatuan, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [currentDetailId, tranid, itemId, qty, hargaSatuan, note]
      );

      // UPDATE STOK (IN = TAMBAH)
      const newStok = productRows[0].stok + qty;
      await conn.query(
        "UPDATE products SET stok = ? WHERE id = ?",
        [newStok, itemId]
      );

      // INSERT STOCKLOG
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
      CREATE TRANSACTION OUT (dari format frontend)
  ============================================================ */
  async createOut(req, res) {
  const { rows, user_id } = req.body;

  if (!user_id || !rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: "Data transaksi tidak lengkap" });
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // ================================
    // GET LAST TRANSACTION ID
    // ================================
    const [[lastTran]] = await conn.query(`
      SELECT tranid 
      FROM transactions
      ORDER BY tranid DESC
      LIMIT 1
    `);

    function generateTransactionId(lastId) {
      if (!lastId) return "T001";
      const num = parseInt(lastId.substring(1)) + 1;
      return "T" + num.toString().padStart(3, "0");
    }

    const tranid = generateTransactionId(lastTran?.tranid);

    // INSERT TRANSACTION
    await conn.query(
      `INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type)
       VALUES (?, ?, ?, ?)`,
      [tranid, user_id, null, "OUT"]
    );

    // ================================
    // GET LAST DETAIL ID
    // ================================
    const [[lastDetail]] = await conn.query(`
      SELECT id 
      FROM transaction_details
      ORDER BY id DESC
      LIMIT 1
    `);

    function generateTransactionDetailId(lastId) {
      if (!lastId) return "TD001";
      const num = parseInt(lastId.substring(2)) + 1;
      return "TD" + num.toString().padStart(3, "0");
    }

    let currentDetailId = lastDetail?.id;

    // ================================
    // INSERT EACH ROW
    // ================================
    for (const row of rows) {
      const itemId = row.itemId || row.product_id;
      const qty = row.qty || row.quantity;
      const note = row.note || null;

      if (!itemId || !qty) continue;

      // LOCK PRODUCT ROW
      const [productRows] = await conn.query(
        "SELECT hargaSatuan, stok FROM products WHERE id = ? FOR UPDATE",
        [itemId]
      );

      if (productRows.length === 0) {
        throw new Error(`Produk ${itemId} tidak ditemukan`);
      }

      if (productRows[0].stok < qty) {
        throw new Error(
          `Stok produk ${itemId} tidak mencukupi. Stok tersedia: ${productRows[0].stok}, dibutuhkan: ${qty}`
        );
      }

      const hargaSatuan = productRows[0].hargaSatuan || 0;

      // GENERATE DETAIL ID
      currentDetailId = generateTransactionDetailId(currentDetailId);

      await conn.query(
        `INSERT INTO transaction_details 
         (id, transaction_id, product_id, quantity, hargaSatuan, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [currentDetailId, tranid, itemId, qty, hargaSatuan, note]
      );

      // UPDATE STOK
      const newStok = productRows[0].stok - qty;
      await conn.query(
        "UPDATE products SET stok = ? WHERE id = ?",
        [newStok, itemId]
      );

      // STOCKLOG (UUID)
      const stocklogId = uuid();
      await conn.query(
        `INSERT INTO stocklog (stokid, product_id, change_type, quantity, transaction_id)
         VALUES (?, ?, ?, ?, ?)`,
        [stocklogId, itemId, "OUT", qty, tranid]
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
      GET ALL TRANSACTIONS WITH DETAILS (FOR STOCK LOG & HISTORY)
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
          u.username AS akun,
          s.namaSupplier
        FROM stocklog sl
        LEFT JOIN transactions t ON t.tranid = sl.transaction_id
        LEFT JOIN products p ON p.id = sl.product_id
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN suppliers s ON s.supid = t.supplier_id
        ORDER BY COALESCE(t.transaction_date, NOW()) DESC, sl.stokid DESC
      `);

      // Format data sesuai yang diharapkan frontend
      const transactions = rows.map(row => ({
        transaksiId: row.transaksiId,
        id: row.transaksiId,
        tranid: row.transaksiId,
        tanggal: row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-',
        date: row.tanggal,
        tipe: row.tipe || row.type,
        type: row.tipe || row.type,
        namaItem: row.namaItem,
        itemName: row.namaItem,
        item: row.namaItem,
        qty: row.qty,
        quantity: row.qty,
        jumlah: row.qty,
        hargaSatuan: row.hargaSatuan,
        harga_satuan: row.hargaSatuan,
        product_id: row.product_id,
        productId: row.product_id,
        idBarang: row.product_id,
        user_id: row.user_id,
        userId: row.user_id,
        username: row.akun,
        akun: row.akun,
        supplier_id: row.supplier_id,
        supplierId: row.supplier_id,
        supid: row.supplier_id,
        catatan: row.catatan,
        note: row.catatan,
        namaSupplier: row.namaSupplier
      }));

      res.json({ transactions });
    } catch (err) {
      console.error("Error fetching all transactions:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        sqlMessage: err.sqlMessage
      });
      
      // Jika error karena tabel tidak ada, kembalikan array kosong
      if (err.code === 'ER_NO_SUCH_TABLE' || err.message.includes('stocklog')) {
        console.warn("⚠️  Table stocklog tidak ada, mengembalikan array kosong");
        return res.json({ transactions: [] });
      }
      
      res.status(500).json({ 
        message: "Gagal mengambil data transaksi",
        error: err.message 
      });
    }
  },


  /* ============================================================
      DASHBOARD SUMMARY (ALL TIME)
      pemasukan = OUT (penjualan), pengeluaran = IN (pembelian)
  ============================================================ */
  async summary(req, res) {
    try {
      const [[result]] = await pool.query(`
        SELECT 
          SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pemasukan,
          SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity * td.hargaSatuan ELSE 0 END) AS pengeluaran
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
      DASHBOARD SUMMARY TODAY
      pemasukan = OUT (penjualan), pengeluaran = IN (pembelian)
  ============================================================ */
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

      const pemasukan = result.pemasukan || 0;
      const pengeluaran = result.pengeluaran || 0;
      const profit = pemasukan - pengeluaran;

      res.json({ pemasukan, pengeluaran, profit });

    } catch (err) {
      res.status(500).json({ message: "Gagal fetch summary hari ini" });
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