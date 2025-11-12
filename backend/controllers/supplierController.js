import db from "../services/sqlDB.js";

export const getAllSuppliers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM suppliers");
    res.json({ suppliers: rows });
  } catch (err) {
    console.error("Error getAllSuppliers:", err);
    res.status(500).json({ message: "Gagal mengambil data supplier" });
  }
};
