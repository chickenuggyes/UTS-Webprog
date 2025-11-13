// transaction.js (versi pakai mapping produk -> supplier)

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

  const btnIn      = document.getElementById("btnIn");
  const btnOut     = document.getElementById("btnOut");
  const btnHistory = document.getElementById("btnHistory");
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

  // ---------- Tombol In / Out / History ----------
  btnIn?.addEventListener("click", () => (window.location.href = "in.html"));
  btnOut?.addEventListener("click", () => (window.location.href = "out.html"));
  // History tetap di halaman ini, jadi ga perlu apa-apa

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

  // ---------- Load history + supplier name ----------
  (async function loadHistory() {
    if (!tbodyHist) return;

    // pastikan map produk & supplier sudah ada
    await ensureMetaLoaded();

    try {
      const resp = await getJSON(`${API}/transactions`);
      const rows = resp?.transactions || resp?.data || resp || [];

      console.log("📊 Data transaksi dari API:", rows.slice(0, 2)); // Log 2 transaksi pertama
      // Expand untuk melihat detail
      if (rows.length > 0) {
        console.log("📊 Detail transaksi pertama (expanded):", JSON.stringify(rows[0], null, 2));
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        tbodyHist.innerHTML =
          '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada riwayat transaksi.</td></tr>';
        return;
      }

      // Ambil user yang login
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = currentUser.id;
      
      console.log("👤 User yang login:", currentUser);
      console.log("👤 User ID yang login:", currentUserId);

      tbodyHist.innerHTML = rows
        .map((t) => {
          // Tentukan akun berdasarkan user_id di transaksi (bukan user yang sedang login)
          // Akun harus sesuai dengan user yang benar-benar membuat transaksi
          let akun = "-";
          
          // Prioritas 1: Jika ada akun dari query (username dari JOIN users berdasarkan user_id di transaksi)
          if (t.akun && t.akun !== "System" && t.akun !== null && t.akun !== "") {
            akun = t.akun;
          } 
          // Prioritas 2: Jika ada username di data tapi bukan dari JOIN
          else if (t.username && t.username !== "System" && t.username !== null && t.username !== "") {
            akun = t.username;
          }
          // Jika user_id null, berarti transaksi lama yang tidak punya data user - tampilkan "-"
          // JANGAN gunakan currentUser.username karena itu bukan user yang membuat transaksi
          const transaksiId = t.transaksiId || t.id || t.tranid || "-";
          const tanggal = t.tanggal || t.date || "-";
          const tipeRaw = (t.tipe || t.type || "-").toUpperCase();
          const tipeCls =
            (t.tipe || t.type) === "OUT" ? "text-red-600" : "text-green-600";
          const namaItem = t.namaItem || t.itemName || t.item || "-";
          const qty = t.qty ?? t.jumlah ?? "-";
          const supplierName = getSupplierNameForTx(t);
          const note = t.catatan || t.note || "-";

          // Debug log untuk semua transaksi (hanya 5 pertama)
          const idx = rows.indexOf(t);
          if (idx < 5) {
            console.log(`🔍 Transaksi [${idx + 1}]:`, {
              tranid: t.transaksiId,
              akun: t.akun,
              username: t.username,
              userId: t.userId,
              user_id: t.user_id,
              user_id_type: typeof t.user_id,
              userId_type: typeof t.userId,
              catatan: t.catatan,
              note: t.note
            });
          }

          // Highlight jika transaksi milik user yang login
          const isCurrentUser = currentUserId && (t.userId === currentUserId || t.user_id === currentUserId);
          const rowClass = isCurrentUser ? "border-t bg-pink-50" : "border-t";

          return `
            <tr class="${rowClass}">
              <td class="py-2 pr-4 font-semibold ${isCurrentUser ? 'text-pink-600' : ''}">${akun}</td>
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
    } catch (e) {
      console.error("Gagal load history:", e);
      tbodyHist.innerHTML =
        '<tr><td colspan="8" class="py-4 text-gray-500">Belum ada data history atau endpoint belum tersedia.</td></tr>';
    }
  })();
});
