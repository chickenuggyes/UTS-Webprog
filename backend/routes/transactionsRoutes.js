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
  let validUsername = username || null;
  
  if (username) {
    const [u] = await pool.query("SELECT id, username FROM users WHERE username = ?", [username]);
    if (u.length > 0) {
      validUserId = u[0].id;
      validUsername = u[0].username; // Pastikan username dari database
      console.log("✅ User ditemukan via username:", username, "-> user_id:", validUserId);
    } else if (user_id) {
      validUserId = user_id;
      // Coba ambil username dari user_id
      const [uById] = await pool.query("SELECT username FROM users WHERE id = ?", [user_id]);
      if (uById.length > 0) {
        validUsername = uById[0].username;
      }
      console.log("⚠️ User tidak ditemukan via username, menggunakan user_id:", validUserId);
    }
  } else if (user_id) {
    validUserId = user_id;
    // Coba ambil username dari user_id
    const [uById] = await pool.query("SELECT username FROM users WHERE id = ?", [user_id]);
    if (uById.length > 0) {
      validUsername = uById[0].username;
    }
    console.log("✅ Menggunakan user_id langsung:", validUserId);
  }

  if (!validUserId) {
    console.error("❌ ERROR: validUserId is NULL! username:", username, "user_id:", user_id);
    conn.release();
    return res.status(400).json({ 
      message: "User tidak valid. Silakan login ulang.",
      error: "User ID tidak ditemukan"
    });
  }
  
  if (!validUsername) {
    console.error("⚠️ WARNING: validUsername is NULL! username:", username, "user_id:", user_id);
    validUsername = "-"; // Fallback jika username tidak ditemukan
  }

  const finalSupplierId = supplier_id || rows[0]?.supplierId || null;
  const finalNote = note || rows[0]?.note || "";
  
  console.log("📝 Inserting transaction with user_id:", validUserId, "username:", validUsername);

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
        "SELECT hargaSatuan, namaItem FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;
      const namaItem = prodRes[0]?.namaItem || r.itemId;

      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );

      // Ambil supplier name jika ada
      let supplierName = "-";
      if (finalSupplierId || r.supplierId) {
        const supId = finalSupplierId || r.supplierId;
        const [supRes] = await conn.query(
          "SELECT namaSupplier FROM suppliers WHERE supid = ?",
          [supId]
        );
        if (supRes.length > 0) {
          supplierName = supRes[0].namaSupplier;
        }
      }

      // INSERT ke stocklog dengan username (dengan error handling)
      try {
        await conn.query(
          `INSERT INTO stocklog (username, transactionId, type, item, qty, supplier, note, createdAt)
           VALUES (?, ?, 'IN', ?, ?, ?, ?, NOW())`,
          [validUsername, tranid, namaItem, r.qty, supplierName, r.note || finalNote]
        );
      } catch (stocklogErr) {
        // Jika tabel stocklog tidak ada, buat tabel terlebih dahulu
        if (stocklogErr.code === 'ER_NO_SUCH_TABLE' || stocklogErr.message.includes("doesn't exist")) {
          console.log("⚠️ Tabel stocklog tidak ada, membuat tabel...");
          try {
            await conn.query(`
              CREATE TABLE IF NOT EXISTS stocklog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                transactionId VARCHAR(10) NOT NULL,
                type VARCHAR(10) NOT NULL,
                item VARCHAR(255) NOT NULL,
                qty INT NOT NULL,
                supplier VARCHAR(255) DEFAULT '-',
                note TEXT,
                createdAt DATETIME NOT NULL,
                INDEX idx_transactionId (transactionId),
                INDEX idx_username (username),
                INDEX idx_createdAt (createdAt)
              )
            `);
            // Coba INSERT lagi setelah tabel dibuat
            await conn.query(
              `INSERT INTO stocklog (username, transactionId, type, item, qty, supplier, note, createdAt)
               VALUES (?, ?, 'IN', ?, ?, ?, ?, NOW())`,
              [validUsername, tranid, namaItem, r.qty, supplierName, r.note || finalNote]
            );
            console.log("✅ Tabel stocklog berhasil dibuat dan data di-insert");
          } catch (createErr) {
            console.error("❌ Gagal membuat tabel stocklog:", createErr);
            // Transaksi tetap lanjut meskipun stocklog gagal
          }
        } else {
          console.error("❌ Error INSERT ke stocklog:", stocklogErr);
          // Transaksi tetap lanjut meskipun stocklog gagal
        }
      }
    }

    await conn.commit();
    res.json({ message: "Transaksi IN berhasil", tranid });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error transaksi IN:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ 
      message: "Gagal menyimpan transaksi IN",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
  let validUsername = username || null;
  
  if (username) {
    const [u] = await pool.query("SELECT id, username FROM users WHERE username = ?", [username]);
    if (u.length > 0) {
      validUserId = u[0].id;
      validUsername = u[0].username; // Pastikan username dari database
      console.log("✅ User ditemukan via username:", username, "-> user_id:", validUserId);
    } else if (user_id) {
      validUserId = user_id;
      // Coba ambil username dari user_id
      const [uById] = await pool.query("SELECT username FROM users WHERE id = ?", [user_id]);
      if (uById.length > 0) {
        validUsername = uById[0].username;
      }
      console.log("⚠️ User tidak ditemukan via username, menggunakan user_id:", validUserId);
    }
  } else if (user_id) {
    validUserId = user_id;
    // Coba ambil username dari user_id
    const [uById] = await pool.query("SELECT username FROM users WHERE id = ?", [user_id]);
    if (uById.length > 0) {
      validUsername = uById[0].username;
    }
    console.log("✅ Menggunakan user_id langsung:", validUserId);
  }

  if (!validUserId) {
    console.error("❌ ERROR: validUserId is NULL! username:", username, "user_id:", user_id);
    conn.release();
    return res.status(400).json({ 
      message: "User tidak valid. Silakan login ulang.",
      error: "User ID tidak ditemukan"
    });
  }
  
  if (!validUsername) {
    console.error("⚠️ WARNING: validUsername is NULL! username:", username, "user_id:", user_id);
    validUsername = "-"; // Fallback jika username tidak ditemukan
  }

  const finalNote = note || rows[0]?.note || "";
  
  console.log("📝 Inserting transaction with user_id:", validUserId, "username:", validUsername);

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
        "SELECT hargaSatuan, namaItem FROM products WHERE id = ?",
        [r.itemId]
      );
      const harga = prodRes[0]?.hargaSatuan || 0;
      const namaItem = prodRes[0]?.namaItem || r.itemId;

      await conn.query(
        "INSERT INTO transaction_details (id, transaction_id, product_id, quantity, hargaSatuan) VALUES (?, ?, ?, ?, ?)",
        [detailId, tranid, r.itemId, r.qty, harga]
      );

      // INSERT ke stocklog dengan username (OUT tidak punya supplier) - dengan error handling
      try {
        await conn.query(
          `INSERT INTO stocklog (username, transactionId, type, item, qty, supplier, note, createdAt)
           VALUES (?, ?, 'OUT', ?, ?, '-', ?, NOW())`,
          [validUsername, tranid, namaItem, r.qty, r.note || finalNote]
        );
      } catch (stocklogErr) {
        // Jika tabel stocklog tidak ada, buat tabel terlebih dahulu
        if (stocklogErr.code === 'ER_NO_SUCH_TABLE' || stocklogErr.message.includes("doesn't exist")) {
          console.log("⚠️ Tabel stocklog tidak ada, membuat tabel...");
          try {
            await conn.query(`
              CREATE TABLE IF NOT EXISTS stocklog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                transactionId VARCHAR(10) NOT NULL,
                type VARCHAR(10) NOT NULL,
                item VARCHAR(255) NOT NULL,
                qty INT NOT NULL,
                supplier VARCHAR(255) DEFAULT '-',
                note TEXT,
                createdAt DATETIME NOT NULL,
                INDEX idx_transactionId (transactionId),
                INDEX idx_username (username),
                INDEX idx_createdAt (createdAt)
              )
            `);
            // Coba INSERT lagi setelah tabel dibuat
            await conn.query(
              `INSERT INTO stocklog (username, transactionId, type, item, qty, supplier, note, createdAt)
               VALUES (?, ?, 'OUT', ?, ?, '-', ?, NOW())`,
              [validUsername, tranid, namaItem, r.qty, r.note || finalNote]
            );
            console.log("✅ Tabel stocklog berhasil dibuat dan data di-insert");
          } catch (createErr) {
            console.error("❌ Gagal membuat tabel stocklog:", createErr);
            // Transaksi tetap lanjut meskipun stocklog gagal
          }
        } else {
          console.error("❌ Error INSERT ke stocklog:", stocklogErr);
          // Transaksi tetap lanjut meskipun stocklog gagal
        }
      }
    }

    await conn.commit();
    res.json({ message: "Transaksi OUT berhasil", tranid });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error transaksi OUT:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ 
      message: "Gagal menyimpan transaksi OUT",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    conn.release();
  }
});

/* ========================================================
   📊 FETCH Semua Transaksi (prioritas dari stocklog, fallback ke transactions)
======================================================== */
router.get("/", async (req, res) => {
  try {
    let rows = [];
    let useStocklog = false;
    
    // Coba query dari stocklog yang sudah berisi username
    try {
      const [stocklogRows] = await pool.query(`
        SELECT 
          transactionId AS transaksiId,
          type AS tipe,
          DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS tanggal,
          item AS namaItem,
          qty,
          supplier,
          note AS catatan,
          username,
          username AS akun
        FROM stocklog
        ORDER BY createdAt DESC
      `);
      
      if (stocklogRows && stocklogRows.length > 0) {
        rows = stocklogRows;
        useStocklog = true;
        console.log("✅ Menggunakan data dari stocklog:", rows.length, "rows");
      }
    } catch (stocklogErr) {
      // Jika tabel stocklog tidak ada atau error, akan fallback ke transactions
      if (stocklogErr.code === 'ER_NO_SUCH_TABLE' || stocklogErr.message.includes("doesn't exist")) {
        console.log("⚠️ Tabel stocklog tidak ada, menggunakan fallback ke transactions table");
      } else {
        console.error("⚠️ Error query stocklog:", stocklogErr.message);
      }
    }

    // Jika stocklog kosong atau tidak ada, query dari transactions (untuk backward compatibility)
    if (!useStocklog || rows.length === 0) {
      console.log("📊 Query dari transactions table...");
      const [transactionRows] = await pool.query(`
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

      rows = transactionRows || [];

      // Ambil username untuk rows yang tidak punya username
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

      // Tambahkan username ke setiap row
      rows = rows.map(row => {
        let username = row.username_from_join;
        
        if (!username && row.user_id && usernameMap[row.user_id]) {
          username = usernameMap[row.user_id];
        }
        
        if (!username || username === null) {
          username = row.user_id ? 'Unknown' : 'System';
        }

        return {
          ...row,
          akun: username,
          username: username
        };
      });
      
      console.log("✅ Menggunakan data dari transactions:", rows.length, "rows");
    }

    console.log("📊 Total transactions fetched:", rows.length);
    if (rows.length > 0) {
      console.log("📊 Sample transaction data:", {
        transaksiId: rows[0].transaksiId,
        tipe: rows[0].tipe,
        username: rows[0].username,
        akun: rows[0].akun,
        namaItem: rows[0].namaItem
      });
    } else {
      console.log("⚠️ Tidak ada data transaksi ditemukan");
    }

    res.json({ transactions: rows });
  } catch (err) {
    console.error("❌ Error ambil transaksi:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState
    });
    res.status(500).json({ 
      message: "Gagal mengambil riwayat transaksi",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
