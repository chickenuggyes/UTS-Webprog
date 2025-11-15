// transaction.js (Stock Log + Nota History)

// Jalankan setelah DOM siap
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000";

  const rupiah = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const txError   = document.getElementById("txError");
  const elItem    = document.getElementById("totalItem");
  const elStok    = document.getElementById("totalStok");
  const elHarga   = document.getElementById("totalHarga");

  const tbodyHist = document.getElementById("historyBody");
  const notaList  = document.getElementById("notaList");
  const stockLogContainer = document.getElementById("stockLogContainer");
  const notaContainer     = document.getElementById("notaContainer");

  const btnIn        = document.getElementById("btnIn");
  const btnOut       = document.getElementById("btnOut");
  const btnStockLog  = document.getElementById("btnStockLog");
  const btnHistory   = document.getElementById("btnHistory");
  const sidebarUsername = document.getElementById("sidebarUsername");

  // ---------- Auth + sidebar ----------
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    document.title = user.username + " Transactions";
    if (sidebarUsername) sidebarUsername.textContent = user.username;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("user");
    window.location.href = "../src/login.html";
  });

  // highlight menu aktif
  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage)
      link.classList.add("bg-pink-400", "text-white", "shadow");
    else link.classList.remove("bg-pink-400", "text-white", "shadow");
  });

  // ---------- Tombol In / Out ----------
  btnIn?.addEventListener("click", () => (window.location.href = "in.html"));
  btnOut?.addEventListener("click", () => (window.location.href = "out.html"));

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  }

  // ---------- Load statistik ----------
  (async function loadStats() {
    try {
      const dash = await getJSON(`${API}/dashboard`);
      const totalItem = dash.totalItem ?? 0;
      const totalStok = dash.totalStok ?? 0;
      const totalHarga = dash.totalHarga ?? 0;

      if (elItem) elItem.textContent = totalItem;
      if (elStok) elStok.textContent = totalStok;
      if (elHarga) elHarga.textContent = rupiah(totalHarga);
    } catch (e) {
      if (txError)
        txError.textContent = e.message || "Gagal memuat statistik dashboard";
    }
  })();

  // ---------- Mapping produk & supplier ----------
  let itemsById     = {};
  let itemsByName   = {};
  let suppliersById = {};

  async function ensureMetaLoaded() {
    // kalau sudah pernah load, skip
    if (Object.keys(itemsById).length > 0 || Object.keys(suppliersById).length > 0) {
      return;
    }

    try {
      const [itemsRes, supRes] = await Promise.all([
        getJSON(`${API}/items`),
        getJSON(`${API}/suppliers`),
      ]);

      const items = itemsRes.items || itemsRes || [];
      const sups  = supRes.suppliers || supRes || [];

      itemsById = {};
      itemsByName = {};
      items.forEach((it) => {
        const id   = it.id || it.itemId || it._id;
        const name = (it.namaItem || it.name || it.nama || "").toLowerCase();
        if (!id) return;
        itemsById[id] = it;
        if (name) itemsByName[name] = it;
      });

      suppliersById = {};
      sups.forEach((s) => {
        const id   = s.supid || s.id || s.kode || s.code;
        const name = s.namaSupplier || s.nama || s.name || id;
        if (!id) return;
        suppliersById[id] = name;
      });
    } catch (e) {
      console.error("Gagal load items/suppliers:", e);
      itemsById = {};
      itemsByName = {};
      suppliersById = {};
    }
  }

  function getSupplierNameForTx(t) {
    // 1) coba ambil dari field supplier di transaksi (kalau backend sudah kirim supid)
    let supId =
      t.supplier_id ||
      t.supplierId ||
      t.supid ||
      t.supId ||
      null;

    // 2) kalau belum ada, coba dari product_id
    if (!supId) {
      const prodId =
        t.product_id ||
        t.productId ||
        t.idBarang ||
        null;
      if (prodId && itemsById[prodId]) {
        supId = itemsById[prodId].supid || itemsById[prodId].supplier_id || null;
      }
    }

    // 3) kalau belum juga, match berdasarkan nama barang
    if (!supId) {
      const nameKey = (t.namaItem || t.itemName || t.item || "").toLowerCase();
      const prod    = itemsByName[nameKey];
      if (prod) {
        supId = prod.supid || prod.supplier_id || null;
      }
    }

    // 4) konversi supId ke nama supplier
    if (supId && suppliersById[supId]) return suppliersById[supId];
    if (supId) return supId; // fallback: tampilkan id kalau nama nggak ketemu
    return "-";
  }

  // ---------- Helper: switch view Stock Log / History ----------
  function setView(view) {
    const activeClasses   = ["bg-pink-500", "text-white"];
    const inactiveClasses = ["text-pink-600", "hover:bg-pink-50"];

    if (view === "stock") {
      stockLogContainer?.classList.remove("hidden");
      notaContainer?.classList.add("hidden");

      btnStockLog?.classList.add(...activeClasses);
      btnStockLog?.classList.remove(...inactiveClasses);

      btnHistory?.classList.remove(...activeClasses);
      btnHistory?.classList.add(...inactiveClasses);
    } else {
      stockLogContainer?.classList.add("hidden");
      notaContainer?.classList.remove("hidden");

      btnHistory?.classList.add(...activeClasses);
      btnHistory?.classList.remove(...inactiveClasses);

      btnStockLog?.classList.remove(...activeClasses);
      btnStockLog?.classList.add(...inactiveClasses);
    }
  }

  btnStockLog?.addEventListener("click", () => setView("stock"));
  btnHistory?.addEventListener("click", () => setView("history"));

  // default: Stock Log dulu
  setView("stock");

  // ---------- Render nota ala CLI ----------
function renderNotaBlock(tx) {
  const judul = tx.type === "IN" ? "Transaksi Masuk" : "Transaksi Keluar";
  const garis = "------------------------------------------------------------";

  const rows = tx.items
    .map(it => {
      const nama   = String(it.nama || "-");
      const jumlah = String(it.qty ?? "-");
      const harga  = it.harga != null ? rupiah(it.harga) : "-";
      const total  = it.total != null ? rupiah(it.total) : "-";

      return `| ${nama.padEnd(15)} | ${jumlah.padEnd(6)} | ${harga.padEnd(12)} | ${total.padEnd(12)} |`;
    })
    .join("\n");

  const grandTotal = tx.total != null ? rupiah(tx.total) : "-";

  return `
<div class="p-4 border border-pink-100 rounded-lg bg-white/60 shadow-sm">
  <pre class="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-5">
${judul} #${tx.id}
Tanggal: ${tx.tanggal}
Supplier: ${tx.supplier}
${garis}
| Nama Produk     | Jumlah | Harga Satuan | Total       |
${garis}
${rows || "(tidak ada item)"}
${garis}
Total: ${grandTotal}
  </pre>
</div>
`;
}



  function fillNotaHistory(groupedArr) {
    if (!notaList) return;
    if (!groupedArr.length) {
      notaList.innerHTML =
        '<p class="text-gray-400">Belum ada transaksi keluar yang bisa ditampilkan sebagai nota.</p>';
      return;
    }

    notaList.innerHTML = groupedArr.map(renderNotaBlock).join("");
  }

  // ---------- Load history + supplier name + nota ----------
  (async function loadHistory() {
    if (!tbodyHist) return;

    // pastikan map produk & supplier sudah ada
    await ensureMetaLoaded();

    try {
      const resp = await getJSON(`${API}/transactions`);
      const rows = resp?.transactions || resp?.data || resp || [];

      if (!Array.isArray(rows) || rows.length === 0) {
        tbodyHist.innerHTML =
          '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada riwayat transaksi.</td></tr>';
        fillNotaHistory([]); // kosongkan nota juga
        return;
      }

      // Ambil user yang login (untuk highlight row-nya saja)
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = currentUser.id;

      // --- 1) STOCK LOG (tabel) ---
      tbodyHist.innerHTML = rows
        .map((t, idx) => {
          let akun = "-";

          if (t.akun && t.akun !== "System" && t.akun !== null && t.akun !== "") {
            akun = t.akun;
          } else if (t.username && t.username !== "System" && t.username !== null && t.username !== "") {
            akun = t.username;
          }

          const transaksiId = t.transaksiId || t.id || t.tranid || "-";
          const tanggal = t.tanggal || t.date || "-";
          const tipeRaw = (t.tipe || t.type || "-").toUpperCase();
          const tipeCls =
            (t.tipe || t.type) === "OUT" ? "text-red-600" : "text-green-600";
          const namaItem = t.namaItem || t.itemName || t.item || "-";
          const qty = t.qty ?? t.jumlah ?? "-";
          const supplierName = getSupplierNameForTx(t);
          const note = t.catatan || t.note || "-";

          const isCurrentUser =
            currentUserId && (t.userId === currentUserId || t.user_id === currentUserId);
          const rowClass = isCurrentUser ? "border-t bg-pink-50" : "border-t";

          return `
            <tr class="${rowClass}">
              <td class="py-2 pr-4 font-semibold ${isCurrentUser ? "text-pink-600" : ""}">${akun}</td>
              <td class="py-2 pr-4 font-mono text-xs">${transaksiId}</td>
              <td class="py-2 pr-4">${tanggal}</td>
              <td class="py-2 pr-4 ${tipeCls}">${tipeRaw}</td>
              <td class="py-2 pr-4">${namaItem}</td>
              <td class="py-2 pr-4">${qty}</td>
              <td class="py-2 pr-4">${supplierName}</td>
              <td class="py-2 pr-4">${note}</td>
            </tr>
          `;
        })
        .join("");

      // --- 2) HISTORY NOTA (kelompok per transaksi, khusus OUT) ---
      const grouped = {};

      rows.forEach((t) => {
        const type = (t.tipe || t.type || "").toUpperCase();

        // kalau mau nota hanya barang keluar:
        if (type !== "OUT") return;

        const idTx = t.transaksiId || t.tranid || t.id;
        if (!idTx) return;

        if (!grouped[idTx]) {
          grouped[idTx] = {
            id: idTx,
            tanggal: t.tanggal || t.date || "-",
            supplier: getSupplierNameForTx(t),
            type,
            items: [],
            total: 0,
          };
        }

  const namaItem = t.namaItem || t.itemName || t.item || "-";
  const qty = Number(t.qty ?? t.jumlah ?? t.quantity ?? 0);

  let harga = 0;
  if (t.hargaSatuan != null) {
    harga = Number(t.hargaSatuan);
  } else if (t.harga_satuan != null) {
    harga = Number(t.harga_satuan);
  } else {
    const prodId =
      t.product_id ||
      t.productId ||
      t.idBarang ||
      null;
    if (prodId && itemsById[prodId] && itemsById[prodId].hargaSatuan != null) {
      harga = Number(itemsById[prodId].hargaSatuan);
    }
  }

  const lineTotal = qty * harga;

  grouped[idTx].items.push({
    nama: namaItem,
    qty,
    harga,
    total: lineTotal,
  });

  grouped[idTx].total += lineTotal;

      });

      const groupedArr = Object.values(grouped);
      fillNotaHistory(groupedArr);
    } catch (e) {
      console.error("Gagal load history:", e);
      tbodyHist.innerHTML =
        '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada data history atau endpoint belum tersedia.</td></tr>';
      fillNotaHistory([]);
    }
  })();
});
