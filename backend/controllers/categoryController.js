import { db } from "../services/sqlDB.js";

export const categoryController = {
  // GET /categories - Get all categories
  async list(req, res) {
    try {
      const [categories] = await db.query("SELECT * FROM categories ORDER BY catid");
      res.json({ categories });
    } catch (err) {
      console.error("List categories error:", err);
      res.status(500).json({ message: "Gagal mengambil data kategori" });
    }
  }
};

