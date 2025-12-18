import { db } from "../services/sqlDB.js";

export async function dashboard(req, res) {
  try {
    const [productStats] = await db.query(`
      SELECT 
        COUNT(*) AS totalItem,
        SUM(stok) AS totalStok,
        SUM(hargaSatuan * stok) AS totalHarga
      FROM products
    `);

    const [[kategori]] = await db.query(`
      SELECT COUNT(*) AS totalKategori
      FROM categories
    `);

    const [lowStock] = await db.query(`
      SELECT id, namaItem, stok 
      FROM products 
      WHERE stok < 5
    `);

      const [topInOut] = await db.query(`
      SELECT 
        p.namaItem,
        SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity ELSE 0 END) AS total_in,
        SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity ELSE 0 END) AS total_out
      FROM products p
      LEFT JOIN transaction_details td ON td.product_id = p.id
      LEFT JOIN transactions t ON t.tranid = td.transaction_id
      GROUP BY p.id, p.namaItem
      ORDER BY (total_in + total_out) DESC
    `);

    res.json({
      totalItem: productStats[0]?.totalItem || 0,
      totalStok: productStats[0]?.totalStok || 0,
      totalHarga: productStats[0]?.totalHarga || 0,
      totalKategori: kategori.totalKategori || 0,
      lowStockAlert: lowStock || [],
      grafikInOut: topInOut || []
    });

  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ message: "Gagal mengambil data dashboard" });
  }
}
