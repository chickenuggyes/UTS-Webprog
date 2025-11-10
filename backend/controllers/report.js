import { db } from "../services/sqlDB.js";
import PDFDocument from "pdfkit";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { 
    style: "currency", 
    currency: "IDR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

export async function report(req, res) {
  try {
    const q = (req.query.q || "").toLowerCase();
    const minHarga = Number(req.query.minHarga || 0);
    const maxHarga = Number(req.query.maxHarga || Number.MAX_SAFE_INTEGER);

    let sql = `SELECT * FROM products WHERE hargaSatuan BETWEEN ? AND ?`;
    const params = [minHarga, maxHarga];

    if (q) {
      sql += ` AND (LOWER(namaItem) LIKE ? OR LOWER(keterangan) LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    const [items] = await db.query(sql, params);
    res.json({ count: items.length, items });
  } catch (err) {
    console.error("Error report:", err);
    res.status(500).json({ message: "Gagal mengambil data laporan" });
  }
}

export async function dashboard(req, res) {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) AS totalItem,
        SUM(stok) AS totalStok,
        SUM(hargaSatuan * stok) AS totalHarga
      FROM products
    `);

    res.json({
      totalItem: stats.totalItem || 0,
      totalStok: stats.totalStok || 0,
      totalHarga: stats.totalHarga || 0,
    });
  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ message: "Gagal mengambil data dashboard" });
  }
}

export async function reportPdf(req, res) {
  try {
    const q = (req.query.q || "").toLowerCase();
    let sql = "SELECT * FROM products";
    const params = [];

    if (q) {
      sql += " WHERE LOWER(namaItem) LIKE ? OR LOWER(keterangan) LIKE ?";
      params.push(`%${q}%`, `%${q}%`);
    }

    const [items] = await db.query(sql, params);

    const totalItem  = items.length;
    const totalStok  = items.reduce((a, it) => a + Number(it.stok || 0), 0);
    const totalHarga = items.reduce(
      (a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0),
      0
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="laporan-barang.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    // Judul laporan
    doc.fontSize(16).text("Laporan Daftar Barang Toko Gembira", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#555")
      .text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1);
    doc.fillColor("#000");

    // Ringkasan
    doc.fontSize(11).text(`Total Item: ${totalItem}`);
    doc.text(`Total Stok: ${totalStok}`);
    doc.text(`Total Nilai Persediaan: ${rupiah(totalHarga)}`);
    doc.moveDown(0.5);

    // Garis pemisah
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#999").stroke();
    doc.moveDown(0.5);

    // Header tabel
    const cols = [
      { label: "#", width: 30, align: "left" },
      { label: "Nama", width: 160, align: "left" },
      { label: "Qty", width: 50, align: "left" },
      { label: "Keterangan", width: 120, align: "left" },
      { label: "Harga", width: 80, align: "right" },
      { label: "Stok", width: 45, align: "right" },
      { label: "Subtotal", width: 90, align: "right" }
    ];

    let y = doc.y;
    const startX = 40;

    // Header kolom
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#222");
    let x = startX;
    cols.forEach(c => {
      doc.text(c.label, x, y, { width: c.width, align: c.align });
      x += c.width;
    });
    y += 18;
    doc.moveTo(startX, y - 4).lineTo(startX + 575, y - 4).strokeColor("#999").stroke();
    doc.font("Helvetica").fillColor("#000");

    // Isi tabel
    items.forEach((it, idx) => {
      const subtotal = Number(it.hargaSatuan || 0) * Number(it.stok || 0);
      let x = startX;
      const cells = [
        String(idx + 1),
        String(it.namaItem ?? "-"),
        String(it.keterangan ?? "-"),
        rupiah(it.hargaSatuan || 0),
        String(it.stok ?? 0),
        rupiah(subtotal),
      ];

      cols.forEach((c, i) => {
        doc.text(cells[i], x, y, { width: c.width, align: c.align });
        x += c.width;
      });

      y += 20;
      doc.moveTo(startX, y).lineTo(startX + 575, y).strokeColor("#eee").stroke();
      y += 2;
    });

    // Total akhir
    doc.moveDown(1);
    doc.font("Helvetica-Bold");
    doc.text("TOTAL:", startX + 400, y, { width: 70, align: "right" });
    doc.text(rupiah(totalHarga), startX + 470, y, { width: 90, align: "right" });
    doc.font("Helvetica");

    doc.end();
  } catch (err) {
    console.error("Error reportPdf:", err);
    res.status(500).json({ message: "Gagal membuat PDF laporan" });
  }
}