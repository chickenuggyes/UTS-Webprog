import express from "express";
import pool from "../services/sqlDB.js";

const router = express.Router();

/* ========================================================
   🔢 ID Generator (T001, T002…)
======================================================== */
async function generateTransactionId(conn) {
  const [rows] = await conn.query(`
    SELECT tranid
    FROM transactions
    WHERE tranid REGEXP '^T[0-9]{3}$'
    ORDER BY tranid DESC
    LIMIT 1
  `);

  if (rows.length === 0) return "T001";

  const last = parseInt(rows[0].tranid.substring(1)) + 1;
  return "T" + last.toString().padStart(3, "0");
}

async function generateDetailId(conn) {
  const [rows] = await conn.query(`
    SELECT id
    FROM transaction_details
    WHERE id REGEXP '^TD[0-9]{3}$'
    ORDER BY id DESC
    LIMIT 1
  `);

  if (rows.length === 0) return "TD001";

  const last = parseInt(rows[0].id.substring(2)) + 1;
  return "TD" + last.toString().padStart(3, "0");
}

/* ========================================================
   📦 STOCK IN
======================================================== */
router.post("/in", async (req, res) => {
  const { supplier_id, note, rows, username, user_id } = req.body;

  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();

  // Validasi user
  let validUserId = null;
  let validUsername = username || null;

  if (username) {
    const [u] = await pool.query(
      "SELECT id, username FROM users WHERE username = ?",
      [username]
    );
    if (u.length > 0) {
      validUserId = u[0].id;
      validUsername = u[0].username;
    }
  }

  if (!validUserId && user_id) {
    validUserId = user_id;
    const [u] = await pool.query("SELECT username FROM users WHERE id = ?", [
      user_id,
    ]);
    if (u.length > 0) validUsername = u[0].username;
  }

  if (!validUserId) {
    conn.release();
    return res.status(400).json({ message: "User tidak valid" });
  }

  const finalSupplierId = supplier_id || rows[0]?.supplierId || null;
  const finalNote = note || rows[0]?.note || "";

  try {
    await conn.beginTransaction();

    const tranid = await generateTransactionId(conn);

    await conn.query(
      "INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type, note) VALUES (?, ?, ?, 'IN', ?)",
      [tranid, validUserId, finalSupplierId, finalNote]
    );

    for (const r of rows) {
      const detailId = await generateDetailId(conn);

      const [prod] = await conn.query(
        "SELECT hargaSatuan, namaItem FROM products WHERE id = ?",
        [r.itemId]
      );

      const harga = prod[0]?.hargaSatuan || 0;
      const namaItem = prod[0]?.namaItem;

      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );

    await conn.query(
      `
      INSERT INTO stocklog (stokid, transaction_id, product_id, user_id, change_type, quantity)
      VALUES (UUID(), ?, ?, ?, ?, ?)
      `,
      [tranid, r.itemId, validUserId, 'OUT', r.qty]
    );
    }

    await conn.commit();
    res.json({ message: "Transaksi IN berhasil", tranid });
    } catch (err) {
    console.error("❌ ERROR OUT:", err); // <--- TAMBAH INI
    await conn.rollback();
    res.status(500).json({ message: "Gagal transaksi IN", error: err.message });
  }finally {
    conn.release();
  }
});

/* ========================================================
   📤 STOCK OUT
======================================================== */
router.post("/out", async (req, res) => {
  const { note, rows, username, user_id } = req.body;

  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();

  // Validasi user
  let validUserId = null;
  let validUsername = username || null;

  if (username) {
    const [u] = await pool.query(
      "SELECT id, username FROM users WHERE username = ?",
      [username]
    );
    if (u.length > 0) {
      validUserId = u[0].id;
      validUsername = u[0].username;
    }
  }

  if (!validUserId && user_id) {
    validUserId = user_id;
    const [u] = await pool.query("SELECT username FROM users WHERE id = ?", [
      user_id,
    ]);
    if (u.length > 0) validUsername = u[0].username;
  }

  if (!validUserId) {
    conn.release();
    return res.status(400).json({ message: "User tidak valid" });
  }

  const finalNote = note || rows[0]?.note || "";

  try {
    await conn.beginTransaction();

    const tranid = await generateTransactionId(conn);

    await conn.query(
      "INSERT INTO transactions (tranid, user_id, transaction_type, note) VALUES (?, ?, 'OUT', ?)",
      [tranid, validUserId, finalNote]
    );

    for (const r of rows) {
      const detailId = await generateDetailId(conn);

      const [prod] = await conn.query(
        "SELECT hargaSatuan, namaItem FROM products WHERE id = ?",
        [r.itemId]
      );

      const harga = prod[0]?.hargaSatuan || 0;
      const namaItem = prod[0]?.namaItem;

      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );

    await conn.query(
      `
      INSERT INTO stocklog (stokid, transaction_id, product_id, user_id, change_type, quantity)
      VALUES (UUID(), ?, ?, ?, ?, ?)
      `,
      [tranid, r.itemId, validUserId, 'OUT', r.qty]
    );
    }

    await conn.commit();
    res.json({ message: "Transaksi OUT berhasil", tranid });
    } catch (err) {
    console.error("❌ ERROR OUT:", err); // <--- TAMBAH INI
    await conn.rollback();
    res.status(500).json({ message: "Gagal transaksi OUT", error: err.message });
  } finally {
    conn.release();
  }
});

/* ========================================================
   📊 GET Semua Transaksi (UNTUK STOCK LOG + NOTA HISTORY)
======================================================== */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        t.tranid AS transaksiId,
        t.transaction_type AS tipe,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d %H:%i:%s') AS tanggal,
        t.note AS catatan,

        td.product_id,
        td.quantity AS qty,
        td.hargaSatuan,

        p.namaItem,
        COALESCE(s.namaSupplier, '-') AS supplier,

        u.username AS akun,
        u.id AS user_id     -- ⬅⬅⬅ DITAMBAH untuk highlight

      FROM transactions t
      JOIN transaction_details td ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      LEFT JOIN suppliers s ON t.supplier_id = s.supid
      LEFT JOIN users u ON t.user_id = u.id

      ORDER BY t.transaction_date DESC
    `);

    res.json({ transactions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil transaksi" });
  }
});

export default router;
