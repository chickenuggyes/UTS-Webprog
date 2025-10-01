import { db } from "../services/jsonDB.js";
import PDFDocument from "pdfkit";

// Helper format rupiah
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(Number(n || 0));

export function report(req, res) {
  // ... (punyamu yang lama biarkan)
}

// === BARU: /report/pdf ===
export function reportPdf(req, res) {
  const q = (req.query.q || "").toLowerCase();

  // Ambil & filter data
  let items = db.readItems();
  if (q) items = items.filter(it => String(it.namaItem || "").toLowerCase().includes(q));

  const totalItem  = items.length;
  const totalStok  = items.reduce((a, it) => a + Number(it.stok || 0), 0);
  const totalHarga = items.reduce((a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0), 0);

  // Set header response PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="laporan-barang.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  // Judul
  doc.fontSize(16).text("Laporan Daftar Barang", { align: "center" });
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

  // Garis
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#999").stroke().strokeColor("#000");
  doc.moveDown(0.5);

  // Tabel
  const cols = [
    { key: "no",          label: "#",           width: 30,  align: "left" },
    { key: "namaItem",    label: "Nama",        width: 160, align: "left" },
    { key: "quantity",    label: "Qty",         width: 50,  align: "left" },
    { key: "keterangan",  label: "Keterangan",  width: 120, align: "left" },
    { key: "hargaSatuan", label: "Harga",       width: 80,  align: "right" },
    { key: "stok",        label: "Stok",        width: 45,  align: "right" },
    { key: "subtotal",    label: "Subtotal",    width: 90,  align: "right" }
  ];

  const startX = 40;
  let y = doc.y;

  function drawHeader() {
    doc.fontSize(10).fillColor("#222").font("Helvetica-Bold");
    let x = startX;
    cols.forEach(c => {
      doc.text(c.label, x, y, { width: c.width, align: c.align });
      x += c.width;
    });
    doc.font("Helvetica").fillColor("#000");
    y += 18;
    doc.moveTo(startX, y - 4).lineTo(startX + cols.reduce((a, c) => a + c.width, 0), y - 4)
       .strokeColor("#999").stroke().strokeColor("#000");
  }

  function ensurePageSpace(minRows = 1) {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (y + (minRows * 18) > bottom) {
      // Footer page number
      doc.fontSize(9).fillColor("#555")
         .text(`Hal. ${doc.page.number}`, 40, bottom - 10, { align: "right", width: 515 });
      doc.addPage();
      y = 40 + 60; // space for title area if needed
      drawHeader();
    }
  }

  // Header tabel
  drawHeader();

  // Isi
  items.forEach((it, idx) => {
    ensurePageSpace();

    const subtotal = Number(it.hargaSatuan || 0) * Number(it.stok || 0);

    // Hitung tinggi baris dinamis (karena keterangan bisa panjang)
    const namaH = doc.heightOfString(String(it.namaItem ?? "-"), { width: cols[1].width });
    const ketH  = doc.heightOfString(String(it.keterangan ?? "-"), { width: cols[3].width });
    const rowH  = Math.max(16, namaH, ketH) + 4;

    let x = startX;
    const cells = [
      { text: String(idx + 1) },
      { text: String(it.namaItem ?? "-") },
      { text: String(it.quantity ?? "-") },
      { text: String(it.keterangan ?? "-") },
      { text: rupiah(it.hargaSatuan || 0) },
      { text: String(it.stok ?? 0) },
      { text: rupiah(subtotal) }
    ];

    cols.forEach((c, i) => {
      doc.text(cells[i].text, x, y, { width: c.width, align: c.align });
      x += c.width;
    });

    y += rowH;

    // garis antar baris
    doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, c) => a + c.width, 0), y)
       .strokeColor("#eee").stroke().strokeColor("#000");
    y += 2;
  });

  // Total akhir (garis + baris total)
  ensurePageSpace(2);
  doc.moveDown(0.5);
  y = doc.y;
  doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, c) => a + c.width, 0), y)
     .strokeColor("#999").stroke().strokeColor("#000");
  y += 8;

  // tulis total di kolom terakhir
  let x = startX;
  const colSpan = cols.slice(0, cols.length - 3).reduce((a, c) => a + c.width, 0); // sampai sebelum harga/stok/subtotal
  x += colSpan + cols[cols.length - 3].width + cols[cols.length - 2].width; // lompat ke kolom subtotal
  doc.font("Helvetica-Bold");
  doc.text("TOTAL:", x - 70, y, { width: 70, align: "right" });
  doc.text(rupiah(totalHarga), x, y, { width: cols[cols.length - 1].width, align: "right" });
  doc.font("Helvetica");

  // Footer halaman terakhir
  const bottom = doc.page.height - doc.page.margins.bottom;
  doc.fontSize(9).fillColor("#555")
     .text(`Hal. ${doc.page.number}`, 40, bottom - 10, { align: "right", width: 515 });

  doc.end();
}
