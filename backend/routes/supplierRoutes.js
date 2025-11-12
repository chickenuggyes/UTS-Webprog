import express from "express";
import { db } from "../services/sqlDB.js";

const router = express.Router();

// --- TEST: endpoint paling dasar untuk cek hidup ---
router.get("/ping", (req, res) => {
  res.json({ message: "Supplier route aktif ✅" });
});

// --- Ambil semua supplier ---
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM suppliers");
    res.json({ suppliers: rows });
  } catch (err) {
    console.error("❌ Error get suppliers:", err.message);
    res.status(500).json({ message: "Gagal mengambil data supplier" });
  }
});

export default router;
