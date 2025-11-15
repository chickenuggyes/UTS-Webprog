// transaction.js (versi pakai mapping produk -> supplier + nota)

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

  const btnIn      = document.getElementById("btnIn");
  const btnOut     = document.getElementById("btnOut");
  const btnHistory = document.getElementById("btnHistory"); // Stock Log
  const btnNota    = document.getElementById("btnNota");    // History (nota)

  const stockLogContainer = document.getElementById("stockLogContainer");
  const notaContainer     = document.getElementById("notaContainer");
  const notaContent       = document.getElementById("notaContent");

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

  // ---------- Tombol In / Out / Stock Log / History ----------
  btnIn?.addEventListener("click", () => (window.location.href = "in.html"));
  btnOut?.addEventListener("click", () => (window.location.href = "out.html"));

  function setView(view) {
    // reset class tombol
    const active = ["bg-pink-500","text-white"];
    const inactive = ["text-pink-600","hover:bg-pink-50"];

    if (view === "stock") {
      btnHistory.classList.add(...active);
      btnHistory.classList.remove(...inactive);
      btnNota.classList.add(...inactive);
      btnNota.classList.remove(...active);

      stockLogContainer.classList.remove("hidden");
      notaContainer.classList.add("hidden");
    } else {
      btnNota.classList.add(...active);
      btnNota.classList.remove(...inactive);
      btnHistory.classList.add(...inactive);
      btnHistory.classList.remove(...active);

      stockLogContainer.classList.add("hidden");
      notaContainer.classList.remove("hidden");
    }
  }

  btnHistory?.addEventListener("click", () => setView("stock"));
  btnNota?.addEventListener("click", () => setView("nota"));

  // default: Stock Log aktif
  setView("stock");

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

      if (elItem)  elItem.textContent  = totalItem;
      if (elStok)  elStok.textContent  = totalStok;
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
    let supId =
      t.supplier_id ||
      t.supplierId ||
      t.supid ||
      t.supId ||
      null;

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

    if (!supId) {
      const nameKey = (t.namaItem || t.itemName || t.item || "").toLowerCase();
      const prod    = itemsByName[nameKey];
      if (prod) {
        supId = prod.supid || prod.supplier_id || null;
      }
    }

    if (supId && suppliersById[supId]) return suppliersById[supId];
    if (supId) return supId;
    return "-";
  }

  // ---------- Build nota-style history ----------
  let allTxRows = [];

  function buildNotaFromTransactions(rows) {
    if (!notaContent) return;

    if (!Array.isArray(rows) || rows.length === 0) {
      notaContent.textContent = "Belum ada transaksi.";
      return;
    }

    // Ambil transaksi OUT terbaru (asumsi rows sudah diurutkan terbaru duluan)
    const firstOut = rows.find(
      (t) => (t.tipe || t.type || "").toUpperCase() === "OUT"
    ) || rows[0];

    const tranId =
      firstOut.transaksiId || firstOut.id || firstOut.tranid || "-";
    const tanggal = firstOut.tanggal || firstOut.date || "-";
    const supplierName = getSupplierNameForTx(firstOut);
    const tipe = (firstOut.tipe || firstOut.type || "TRANSAKSI").toUpperCase();

    // Kumpulkan semua baris dengan transaksi ID yang sama (multi item)
    const sameTxRows = rows.filter((t) => {
      const id = t.transaksiId || t.id || t.tranid;
      return id === tranId;
    });

    let lines = [];
    lines.push(`${tipe === "IN" ? "Transaksi Masuk" : "Transaksi Keluar"} #${tranId}`);
    lines.push(`Tanggal : ${tanggal}`);
    lines.push(`Supplier: ${supplierName}`);
    lines.push("------------------------------------------------------------");
    lines.push("| Nama Produk     | Jumlah | Harga Satuan | Total        |");
    lines.push("|-----------------|--------|--------------|--------------|");

    let grandTotal = 0;

    sameTxRows.forEach((t) => {
      const nama = (t.namaItem || t.itemName || t.item || "-").padEnd(15, " ");
      const qty  = String(t.qty ?? t.jumlah ?? 0).padStart(4, " ");

      const hargaSatuan =
        t.hargaSatuan ?? t.harga ?? t.price ?? 0;
      const totalRow =
        t.total ?? t.totalHarga ?? Number(qty) * Number(hargaSatuan);

      grandTotal += Number(totalRow || 0);

      const hsStr = rupiah(hargaSatuan).replace("Rp", "").trim();
      const totStr = rupiah(totalRow).replace("Rp", "").trim();

      lines.push(
        `| ${nama} | ${qty}   | ${hsStr.padStart(10," ")} | ${totStr.padStart(10," ")} |`
      );
    });

    lines.push("------------------------------------------------------------");
    lines.push(`Total: ${rupiah(grandTotal)}`);

    notaContent.textContent = lines.join("\n");
  }

  // ---------- Load history + supplier name ----------
  (async function loadHistory() {
    if (!tbodyHist) return;

    await ensureMetaLoaded();

    try {
      const resp = await getJSON(`${API}/transactions`);
      const rows = resp?.transactions || resp?.data || resp || [];

      allTxRows = Array.isArray(rows) ? rows : [];

      if (!Array.isArray(rows) || rows.length === 0) {
        tbodyHist.innerHTML =
          '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada riwayat transaksi.</td></tr>';
        notaContent && (notaContent.textContent = "Belum ada transaksi.");
        return;
      }

      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = currentUser.id;

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
            currentUserId &&
            (t.userId === currentUserId || t.user_id === currentUserId);
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

      // build nota pertama kali dari data yang sama
      buildNotaFromTransactions(allTxRows);
    } catch (e) {
      console.error("Gagal load history:", e);
      tbodyHist.innerHTML =
        '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada data history atau endpoint belum tersedia.</td></tr>';
      notaContent && (notaContent.textContent = "Gagal memuat history.");
    }
  })();
});
