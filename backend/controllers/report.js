// reportController.js
import { db } from "../services/sqlDB.js";
import PDFDocument from "pdfkit";

// Format Rupiah
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

// ========================================================
// REPORT JSON (PRODUCTS)
// ========================================================
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

// ========================================================
// DASHBOARD METRIC (TOTAL PRODUK, TOTAL STOK, PEMASUKAN, DLL)
// ========================================================
export async function dashboard(req, res) {
  try {
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) AS totalItem,
        SUM(stok) AS totalStok,
        SUM(hargaSatuan * stok) AS totalHarga
      FROM products
    `);

    const [[pemasukan]] = await db.query(`
      SELECT SUM(td.quantity * p.hargaSatuan) AS total
      FROM transaction_details td
      JOIN transactions t ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      WHERE t.transaction_type = 'IN'
      AND DATE(t.transaction_date) = CURDATE()
    `);

    const [[pengeluaran]] = await db.query(`
      SELECT SUM(td.quantity * p.hargaSatuan) AS total
      FROM transaction_details td
      JOIN transactions t ON td.transaction_id = t.tranid
      JOIN products p ON td.product_id = p.id
      WHERE t.transaction_type = 'OUT'
      AND DATE(t.transaction_date) = CURDATE()
    `);

    const [[transaksiHariIni]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM transactions
      WHERE DATE(transaction_date) = CURDATE()
    `);

    const [barangHampirHabis] = await db.query(`
      SELECT id, namaItem, stok
      FROM products
      WHERE stok < 5
      ORDER BY stok ASC
      LIMIT 5
    `);

    const totalPemasukan = pemasukan.total || 0;
    const totalPengeluaran = pengeluaran.total || 0;
    const laba = totalPemasukan - totalPengeluaran;

    res.json({
      totalItem: stats.totalItem || 0,
      totalStok: stats.totalStok || 0,
      totalHarga: stats.totalHarga || 0,
      totalPemasukanHariIni: totalPemasukan,
      totalPengeluaranHariIni: totalPengeluaran,
      labaHariIni: laba,
      transaksiHariIni: transaksiHariIni.total || 0,
      barangHampirHabis,
    });
  } catch (err) {
    console.error("Error dashboard:", err);
    res.status(500).json({ message: "Gagal mengambil data dashboard" });
  }
}

// ========================================================
// REPORT SUPPLIER JSON
// ========================================================
export async function reportSupplier(req, res) {
  try {
    const [suppliers] = await db.query(`SELECT * FROM supplier ORDER BY id ASC`);
    res.json({ count: suppliers.length, suppliers });
  } catch (err) {
    console.error("Error supplier:", err);
    res.status(500).json({ message: "Gagal mengambil data supplier" });
  }
}

// ========================================================
// PDF REPORT COMBINED (PRODUCTS + SUPPLIER)
// ========================================================
export async function reportPdf(req, res) {
  try {
    // ==================== PRODUCTS ====================
    const [items] = await db.query(`SELECT * FROM products ORDER BY namaItem ASC`);

    const totalItem = items.length;
    const totalStok = items.reduce((a, it) => a + Number(it.stok || 0), 0);
    const totalHarga = items.reduce(
      (a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0),
      0
    );

    // ==================== SUPPLIERS ====================
    const [suppliers] = await db.query(`SELECT * FROM supplier ORDER BY id ASC`);

    // ==================== PDF CONFIG ====================
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-gabungan.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    // ==================== HEADER ====================
    doc.fontSize(16).text("Laporan Produk & Supplier - Toko Gembira", {
      align: "center",
    });
    doc.fontSize(10).fillColor("#555").text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center",
    });
    doc.moveDown(1);
    doc.fillColor("#000");

    // ========================================================
    // SECTION: PRODUK
    // ========================================================
    doc.fontSize(14).text("📦 DATA PRODUK", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).text(`Total Item: ${totalItem}`);
    doc.text(`Total Stok: ${totalStok}`);
    doc.text(`Total Nilai Persediaan: ${rupiah(totalHarga)}`);

    doc.moveDown(1);

    // HEADER TABEL PRODUK
    const prodCols = [
      { label: "#", width: 30, align: "left" },
      { label: "Nama", width: 160, align: "left" },
      { label: "Harga", width: 80, align: "right" },
      { label: "Stok", width: 50, align: "right" },
      { label: "Subtotal", width: 100, align: "right" },
    ];

    let y = doc.y;
    let x = 40;

    doc.font("Helvetica-Bold");
    prodCols.forEach((c) => {
      doc.text(c.label, x, y, { width: c.width, align: c.align });
      x += c.width;
    });

    y += 20;
    doc.font("Helvetica");

    // ROW DATA
    items.forEach((it, idx) => {
      const subtotal = it.hargaSatuan * it.stok;
      let x = 40;

      const cells = [
        idx + 1,
        it.namaItem,
        rupiah(it.hargaSatuan),
        it.stok,
        rupiah(subtotal),
      ];

      prodCols.forEach((c, i) => {
        doc.text(String(cells[i]), x, y, { width: c.width, align: c.align });
        x += c.width;
      });

      y += 20;
    });

    doc.moveDown(2);

    // ========================================================
    // SECTION: SUPPLIER
    // ========================================================
    doc.addPage();
    doc.fontSize(14).text("📑 DATA SUPPLIER", { underline: true });
    doc.moveDown(1);

    const suppCols = [
      { label: "ID", width: 50 },
      { label: "Nama Supplier", width: 200 },
      { label: "No HP", width: 130 },
      { label: "Alamat", width: 150 },
    ];

    y = doc.y;
    x = 40;

    doc.font("Helvetica-Bold");
    suppCols.forEach((c) => {
      doc.text(c.label, x, y, { width: c.width });
      x += c.width;
    });

    doc.font("Helvetica");
    y += 20;

    suppliers.forEach((s) => {
      let x = 40;
      const row = [s.id, s.namaSupplier, s.noHp, s.alamat];

      suppCols.forEach((c, i) => {
        doc.text(String(row[i] ?? "-"), x, y, { width: c.width });
        x += c.width;
      });

      y += 20;
    });

    doc.end();
  } catch (err) {
    console.error("Error reportPdf:", err);
    res.status(500).json({ message: "Gagal membuat PDF laporan" });
  }
}
