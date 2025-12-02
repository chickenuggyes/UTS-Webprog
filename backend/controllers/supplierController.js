import db from "../services/sqlDB.js";

export const supplierController = {
  getAll: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT supid, namaSupplier, kontak, alamat
        FROM suppliers
        ORDER BY supid ASC
      `);

      res.json({ suppliers: rows });
    } catch (err) {
      console.error("Error getAll suppliers:", err);
      res.status(500).json({ message: "Gagal mengambil data supplier" });
    }
  },
};