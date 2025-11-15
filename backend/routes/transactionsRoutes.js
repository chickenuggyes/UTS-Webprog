import express from "express";
import pool from "../services/sqlDB.js";

const router = express.Router();

/* ========================================================
   🔢 ID Generator (T001, T002, … & TD001, TD002, …)
   FIX: pakai REGEXP supaya tidak baca TINxxx / TOUTxxx
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

  const lastNum = parseInt(rows[0].tranid.substring(1)) + 1;
  return "T" + lastNum.toString().padStart(3, "0");
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

  const lastNum = parseInt(rows[0].id.substring(2)) + 1;
  return "TD" + lastNum.toString().padStart(3, "0");
}

/* ========================================================
   📦 STOCK IN  → tambah stok & catat transaksi
======================================================== */
router.post("/in", async (req, res) => {
  console.log("📥 Transaksi IN:", req.body);

  const { supplier_id, note, rows, username, user_id } = req.body || {};
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();

  // --- VALIDASI USER ---
  let validUserId = null;
  if (username) {
    const [u] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (u.length > 0) {
      validUserId = u[0].id;
      console.log("✅ User ditemukan via username:", username, "-> user_id:", validUserId);
    } else if (user_id) {
      validUserId = user_id;
      console.log("⚠️ User tidak ditemukan via username, menggunakan user_id:", validUserId);
    }
  } else if (user_id) {
    validUserId = user_id;
    console.log("✅ Menggunakan user_id langsung:", validUserId);
  }

  if (!validUserId) {
    console.error("❌ ERROR: validUserId is NULL! username:", username, "user_id:", user_id);
  }

  const finalSupplierId = supplier_id || rows[0]?.supplierId || null;
  const finalNote = note || rows[0]?.note || "";
  
  console.log("📝 Inserting transaction with user_id:", validUserId);

  try {
    await conn.beginTransaction();

    // 🔢 Generate T001
    const tranid = await generateTransactionId(conn);

    await conn.query(
      "INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type, note) VALUES (?, ?, ?, 'IN', ?)",
      [tranid, validUserId, finalSupplierId, finalNote]
    );

    for (const r of rows) {
      const detailId = await generateDetailId(conn);

      const [prodRes] = await conn.query(
        "SELECT hargaSatuan FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;

      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );
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
  console.log("📤 Transaksi OUT:", req.body);

  const { note, rows, username, user_id } = req.body;
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  const conn = await pool.getConnection();

  // --- VALIDASI USER ---
  let validUserId = null;
  if (username) {
    const [u] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (u.length > 0) {
      validUserId = u[0].id;
      console.log("✅ User ditemukan via username:", username, "-> user_id:", validUserId);
    } else if (user_id) {
      validUserId = user_id;
      console.log("⚠️ User tidak ditemukan via username, menggunakan user_id:", validUserId);
    }
  } else if (user_id) {
    validUserId = user_id;
    console.log("✅ Menggunakan user_id langsung:", validUserId);
  }

  if (!validUserId) {
    console.error("❌ ERROR: validUserId is NULL! username:", username, "user_id:", user_id);
  }

  const finalNote = note || rows[0]?.note || "";
  
  console.log("📝 Inserting transaction with user_id:", validUserId);

  try {
    await conn.beginTransaction();

    // 🔢 Generate T002
    const tranid = await generateTransactionId(conn);

    await conn.query(
      "INSERT INTO transactions (tranid, user_id, transaction_type, note) VALUES (?, ?, 'OUT', ?)",
      [tranid, validUserId, finalNote]
    );

    for (const r of rows) {
      const detailId = await generateDetailId(conn);

      const [prodRes] = await conn.query(
        "SELECT hargaSatuan FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;

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
   📊 FETCH Semua Transaksi
======================================================== */
router.get("/", async (req, res) => {
  try {
    // Step 1: Ambil semua transaksi dengan JOIN
    let [rows] = await pool.query(`
      SELECT 
        t.tranid AS transaksiId,
        t.transaction_type AS tipe,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d %H:%i:%s') AS tanggal,
        t.note AS catatan,
        p.namaItem,
        td.quantity AS qty,
        COALESCE(s.namaSupplier, '-') AS supplier,
        u.username AS username_from_join,
        u.id AS userId,
        t.user_id
      FROM transactions t
      JOIN transaction_details td ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      LEFT JOIN suppliers s ON t.supplier_id = s.supid
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.transaction_date DESC
    `);

    // Step 2: Jika ada rows dengan user_id tapi tidak ada username, ambil username secara manual
    const userIdsNeedingUsername = [...new Set(rows.filter(r => r.user_id && !r.username_from_join).map(r => r.user_id))];
    
    let usernameMap = {};
    if (userIdsNeedingUsername.length > 0) {
      console.log("🔍 Fetching usernames for user_ids:", userIdsNeedingUsername);
      const placeholders = userIdsNeedingUsername.map(() => '?').join(',');
      const [userRows] = await pool.query(
        `SELECT id, username FROM users WHERE id IN (${placeholders})`,
        userIdsNeedingUsername
      );
      userRows.forEach(u => {
        usernameMap[u.id] = u.username;
      });
      console.log("✅ Username map:", usernameMap);
    }

    // Step 3: Tambahkan username ke setiap row
    rows = rows.map(row => {
      let username = row.username_from_join;
      
      // Jika tidak ada username dari JOIN tapi ada user_id, cari di map
      if (!username && row.user_id && usernameMap[row.user_id]) {
        username = usernameMap[row.user_id];
      }
      
      // Jika masih tidak ada username, gunakan 'System' atau '-'
      if (!username || username === null) {
        username = row.user_id ? 'Unknown' : 'System';
      }

      return {
        ...row,
        akun: username,
        username: username
      };
    });

    console.log("📊 Total transactions fetched:", rows.length);
    if (rows.length > 0) {
      console.log("📊 Sample transaction data:", {
        tranid: rows[0].transaksiId,
        user_id: rows[0].user_id,
        username: rows[0].username,
        akun: rows[0].akun
      });
    }

    res.json({ transactions: rows });
  } catch (err) {
    console.error("❌ Error ambil transaksi:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat transaksi" });
  }
});

export default router;
