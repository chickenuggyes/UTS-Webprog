import { db } from "../services/sqlDB.js";
import PDFDocument from "pdfkit";

// Format Rupiah
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

/* =========================================================
   PDF Laporan Transaksi
========================================================= */
export async function reportTransactionsPdf(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.tranid,
        t.transaction_type,
        t.transaction_date,
        td.quantity,
        p.namaItem,
        p.hargaSatuan
      FROM transactions t
      JOIN transaction_details td ON t.tranid = td.transaction_id
      JOIN products p ON td.product_id = p.id
      ORDER BY t.transaction_date DESC
    `);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-transaksi.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("Laporan Transaksi Barang", { align: "center" });
    doc.fontSize(10).text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center",
    });
    doc.moveDown();

    // Table Header
    doc.fontSize(12).text("ID     Jenis     Tanggal     Produk     Qty     Total");
    doc.moveDown(0.5);
    doc.fontSize(10);

    rows.forEach((r) => {
      const total = r.quantity * r.hargaSatuan;

      doc.text(
        `${r.tranid}   ${r.transaction_type}   ${r.transaction_date}   ${r.namaItem}   ${r.quantity}   ${rupiah(
          total
        )}`
      );
    });

    doc.end();
  } catch (err) {
    console.error("Error transaksi PDF:", err);
    res.status(500).json({ message: "Gagal membuat PDF transaksi" });
  }
}

/* =========================================================
   PDF Laporan STOCK LOG (Mutasi Stok)
========================================================= */
export async function reportStockLogPdf(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.id,
        s.product_id,
        p.namaItem,
        s.old_stock,
        s.new_stock,
        s.description,
        s.created_at
      FROM stock_log s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.created_at DESC
    `);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-stocklog.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text("Laporan Perubahan Stok (Stock Log)", {
      align: "center",
    });
    doc.fontSize(10).text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center",
    });
    doc.moveDown();

    doc.fontSize(12).text("ID   Produk   Lama   Baru   Keterangan   Tanggal");
    doc.moveDown(0.5);
    doc.fontSize(10);

    rows.forEach((r) => {
      doc.text(
        `${r.id}  ${r.namaItem}  ${r.old_stock}  ${r.new_stock}  ${r.description}  ${r.created_at}`
      );
    });

    doc.end();
  } catch (err) {
    console.error("Error stocklog PDF:", err);
    res.status(500).json({ message: "Gagal membuat PDF stock log" });
  }
}
