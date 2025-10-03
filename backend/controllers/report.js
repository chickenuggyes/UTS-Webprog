import { db } from "../services/jsonDB.js";
import PDFDocument from "pdfkit";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { 
    style: "currency", 
    currency: "IDR", 
    maximumFractionDigits: 0 
  }).format(Number(n || 0));

// GET /report
export function report(req, res) {
  const q = (req.query.q || "").toLowerCase();
  const minHarga = Number(req.query.minHarga || 0);
  const maxHarga = Number(req.query.maxHarga || Number.MAX_SAFE_INTEGER);

  let items = db.readItems();

  if (q) {
    items = items.filter(it =>
      String(it.namaItem || "").toLowerCase().includes(q) ||
      String(it.keterangan || "").toLowerCase().includes(q)
    );
  }

  items = items.filter(
    it => Number(it.hargaSatuan) >= minHarga && Number(it.hargaSatuan) <= maxHarga
  );

  res.json({ count: items.length, items });
}

//GET /dashboard
export function dashboard(req, res) {
  const items = db.readItems();
  const totalItem  = items.length;
  const totalStok  = items.reduce((a, it) => a + Number(it.stok || 0), 0);
  const totalHarga = items.reduce(
    (a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0),
    0
  );

  res.json({ totalItem, totalStok, totalHarga });
}

//GET /report/pdf

export function reportPdf(req, res) {
  const q = (req.query.q || "").toLowerCase();

  let items = db.readItems();
  if (q) items = items.filter(it => String(it.namaItem || "").toLowerCase().includes(q));

  const totalItem  = items.length;
  const totalStok  = items.reduce((a, it) => a + Number(it.stok || 0), 0);
  const totalHarga = items.reduce((a, it) => a + Number(it.hargaSatuan || 0) * Number(it.stok || 0), 0);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="laporan-barang.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text("Laporan Daftar Barang Toko Gembira", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#555")
     .text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
  doc.moveDown(1);
  doc.fillColor("#000");

  doc.fontSize(11).text(`Total Item: ${totalItem}`);
  doc.text(`Total Stok: ${totalStok}`);
  doc.text(`Total Nilai Persediaan: ${rupiah(totalHarga)}`);
  doc.moveDown(0.5);

  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#999").stroke().strokeColor("#000");
  doc.moveDown(0.5);

  const cols = [
    { key: "no",          label: "#",           width: 30,  align: "left" },
    { key: "namaItem",    label: "Nama",        width: 160, align: "left" },
    { key: "keterangan",  label: "Keterangan",  width: 120, align: "left" },
    { key: "hargaSatuan", label: "Harga",       width: 80,  align: "right" },
    { key: "stok",        label: "Stok",        width: 45,  align: "right" },
    { key: "subtotal",    label: "Subtotal",    width: 90,  align: "right" }
  ];

  let y = doc.y;
  const startX = 40;

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

  drawHeader();

  items.forEach((it, idx) => {
    const subtotal = Number(it.hargaSatuan || 0) * Number(it.stok || 0);
    let x = startX;
    const cells = [
      String(idx + 1),
      String(it.namaItem ?? "-"),
      String(it.keterangan ?? "-"),
      rupiah(it.hargaSatuan || 0),
      String(it.stok ?? 0),
      rupiah(subtotal)
    ];

    cols.forEach((c, i) => {
      doc.text(cells[i], x, y, { width: c.width, align: c.align });
      x += c.width;
    });

    y += 20;
    doc.moveTo(startX, y).lineTo(startX + cols.reduce((a, c) => a + c.width, 0), y)
       .strokeColor("#eee").stroke().strokeColor("#000");
    y += 2;
  });

  doc.moveDown(1);
  doc.font("Helvetica-Bold");
  doc.text("TOTAL:", startX + 400, y, { width: 70, align: "right" });
  doc.text(rupiah(totalHarga), startX + 470, y, { width: 90, align: "right" });
  doc.font("Helvetica");

  doc.end();
}
