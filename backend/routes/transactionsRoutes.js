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
  // Debug: log seluruh request body
  console.log("📥 ========== TRANSAKSI IN ==========");
  console.log("📥 RAW request body:", JSON.stringify(req.body, null, 2));
  console.log("📥 Request body type:", typeof req.body);
  console.log("📥 Request body keys:", Object.keys(req.body || {}));
  
  const { supplier_id, note, rows, username, user_id } = req.body || {};
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  console.log("📥 Transaksi IN - Full request body:", JSON.stringify(req.body, null, 2));
  console.log("📥 Transaksi IN - username diterima:", username);
  console.log("📥 Transaksi IN - user_id diterima (backward compat):", user_id);
  console.log("📥 Transaksi IN - note diterima:", note);
  console.log("📥 Transaksi IN - supplier_id diterima:", supplier_id);

  // Ambil supplier_id dari row pertama jika tidak ada di body
  const finalSupplierId = supplier_id || rows[0]?.supplierId || null;

  // Cari user_id berdasarkan username
  let validUserId = null;
  const finalUsername = username || null;
  
  if (finalUsername) {
    try {
      const [userCheck] = await pool.query("SELECT id, username FROM users WHERE username = ?", [finalUsername]);
      if (userCheck.length > 0) {
        validUserId = userCheck[0].id;
        console.log("✅ Username valid:", finalUsername, "→ user_id:", validUserId);
      } else {
        console.log("⚠️ Username tidak ditemukan di database:", finalUsername);
        // Fallback: coba gunakan user_id jika ada (backward compatibility)
        if (user_id) {
          validUserId = String(user_id).trim();
          console.log("⚠️ Menggunakan user_id dari request (backward compat):", validUserId);
        }
      }
    } catch (err) {
      console.error("❌ Error cek user:", err);
    }
  } else if (user_id) {
    // Backward compatibility: jika username tidak ada, coba gunakan user_id
    validUserId = String(user_id).trim();
    console.log("⚠️ Username tidak ada, menggunakan user_id (backward compat):", validUserId);
  }
  
  if (!validUserId) {
    console.warn("⚠️ Transaksi akan dibuat tanpa user_id karena username/user_id tidak valid");
  }

  // Ambil catatan dari row pertama jika note global tidak ada
  const finalNote = note || (rows[0]?.note || "");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const tranid = genId("TIN");
    
    // CRITICAL: Log sebelum INSERT
    console.log("💾 Sebelum INSERT transaksi:");
    console.log("   - tranid:", tranid);
    console.log("   - validUserId:", validUserId, "tipe:", typeof validUserId);
    console.log("   - finalSupplierId:", finalSupplierId);
    console.log("   - finalNote:", finalNote);
    
    if (!validUserId) {
      console.error("❌❌❌ WARNING: validUserId adalah NULL! Transaksi akan dibuat tanpa user_id!");
    }
    
    const insertResult = await conn.query(
      "INSERT INTO transactions (tranid, user_id, supplier_id, transaction_type, note) VALUES (?, ?, ?, 'IN', ?)",
      [tranid, validUserId, finalSupplierId, finalNote]
    );
    
    console.log("✅ Transaksi IN tersimpan:");
    console.log("   - tranid:", tranid);
    console.log("   - user_id:", validUserId);
    console.log("   - supplier_id:", finalSupplierId);
    console.log("   - note:", finalNote);
    
    // Verifikasi data yang tersimpan
    const [verify] = await conn.query("SELECT tranid, user_id, note FROM transactions WHERE tranid = ?", [tranid]);
    console.log("🔍 Verifikasi data tersimpan di database:", verify[0]);
    
    if (verify[0] && !verify[0].user_id) {
      console.error("❌❌❌ ERROR: user_id TIDAK TERSIMPAN di database meskipun validUserId ada!");
      console.error("   validUserId yang dikirim:", validUserId);
      console.error("   user_id di database:", verify[0].user_id);
    }

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
  const { note, rows, username, user_id } = req.body;
  if (!rows || rows.length === 0)
    return res.status(400).json({ message: "Data transaksi kosong" });

  console.log("📤 Transaksi OUT - Full request body:", JSON.stringify(req.body, null, 2));
  console.log("📤 Transaksi OUT - username diterima:", username);
  console.log("📤 Transaksi OUT - user_id diterima (backward compat):", user_id);
  console.log("📤 Transaksi OUT - note diterima:", note);

  // Cari user_id berdasarkan username
  let validUserId = null;
  const finalUsername = username || null;
  
  if (finalUsername) {
    try {
      const [userCheck] = await pool.query("SELECT id, username FROM users WHERE username = ?", [finalUsername]);
      if (userCheck.length > 0) {
        validUserId = userCheck[0].id;
        console.log("✅ Username valid:", finalUsername, "→ user_id:", validUserId);
      } else {
        console.log("⚠️ Username tidak ditemukan di database:", finalUsername);
        // Fallback: coba gunakan user_id jika ada (backward compatibility)
        if (user_id) {
          validUserId = String(user_id).trim();
          console.log("⚠️ Menggunakan user_id dari request (backward compat):", validUserId);
        }
      }
    } catch (err) {
      console.error("❌ Error cek user:", err);
    }
  } else if (user_id) {
    // Backward compatibility: jika username tidak ada, coba gunakan user_id
    validUserId = String(user_id).trim();
    console.log("⚠️ Username tidak ada, menggunakan user_id (backward compat):", validUserId);
  }
  
  if (!validUserId) {
    console.warn("⚠️ Transaksi OUT akan dibuat tanpa user_id karena username/user_id tidak valid");
  }

  // Ambil catatan dari row pertama jika note global tidak ada
  const finalNote = note || (rows[0]?.note || "");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const tranid = genId("TOUT");
    await conn.query(
      "INSERT INTO transactions (tranid, user_id, transaction_type, note) VALUES (?, ?, 'OUT', ?)",
      [tranid, validUserId, finalNote]
    );
    
    console.log("✅ Transaksi OUT tersimpan:");
    console.log("   - tranid:", tranid);
    console.log("   - user_id:", validUserId);
    console.log("   - note:", finalNote);
    
    // Verifikasi data yang tersimpan
    const [verify] = await conn.query("SELECT tranid, user_id, note FROM transactions WHERE tranid = ?", [tranid]);
    console.log("🔍 Verifikasi data tersimpan:", verify[0]);

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
    // Query dengan CAST untuk memastikan tipe data sama (user_id dan u.id adalah VARCHAR)
    const [rows] = await pool.query(`
      SELECT 
        t.tranid AS id,
        t.tranid AS transaksiId,
        t.transaction_type AS tipe,
        DATE_FORMAT(t.transaction_date, '%Y-%m-%d %H:%i:%s') AS tanggal,
        t.note AS catatan,
        p.namaItem,
        td.quantity AS qty,
        s.namaSupplier AS supplier,
        u.username AS akun,
        u.id AS userId,
        t.user_id
      FROM transactions t
      JOIN transaction_details td ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      LEFT JOIN suppliers s ON t.supplier_id = s.supid
      LEFT JOIN users u ON CAST(t.user_id AS CHAR) = CAST(u.id AS CHAR)
      ORDER BY t.transaction_date DESC
    `);
    
    // Debug: log semua transaksi untuk cek user_id dan akun
    console.log("📊 Total transaksi:", rows.length);
    
    // Cek apakah ada transaksi dengan user_id tapi username NULL
    const rowsWithUserId = rows.filter(r => r.user_id && !r.akun);
    if (rowsWithUserId.length > 0) {
      console.log("⚠️ Transaksi dengan user_id tapi username NULL:", rowsWithUserId.slice(0, 5).map(r => ({
        tranid: r.transaksiId,
        user_id: r.user_id,
        user_id_type: typeof r.user_id,
        akun: r.akun
      })));
      
      // Cek apakah user_id tersebut ada di database
      for (const r of rowsWithUserId.slice(0, 3)) {
        if (r.user_id) {
          const [userCheck] = await pool.query("SELECT id, username FROM users WHERE id = ?", [r.user_id]);
          console.log(`🔍 Cek user_id "${r.user_id}":`, userCheck.length > 0 ? `✅ Ditemukan: ${userCheck[0].username}` : "❌ Tidak ditemukan");
        }
      }
    }

    // Debug: log beberapa transaksi untuk cek user_id, akun, dan catatan
    if (rows.length > 0) {
      console.log("📊 Sample transaksi (5 pertama):");
      rows.slice(0, 5).forEach((r, idx) => {
        console.log(`  [${idx + 1}] ${r.transaksiId}: user_id="${r.user_id}" (${typeof r.user_id}), akun="${r.akun}", userId="${r.userId}"`);
      });
    }

    res.json({ transactions: rows });
  } catch (err) {
    console.error("❌ Error ambil transaksi:", err);
    res.status(500).json({ message: "Gagal mengambil riwayat transaksi" });
  }
});

export default router;
