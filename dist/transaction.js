// transaction.js (Stock Log + Nota History)
// Ditambahkan: Search realtime + Filter chips (All / IN / OUT)
// Perubahan seminimal mungkin — sisipan kecil tanpa merombak struktur utama.

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ transaction.js loaded");
  
  try {
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
    try {
      console.log("🔗 Fetching:", url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log("📡 Response status:", res.status, res.statusText);
      console.log("📡 Response headers:", res.headers);
      
      // Baca response text dulu untuk debugging
      const responseText = await res.text();
      console.log("📄 Raw response text:", responseText.substring(0, 500));
      
      if (!res.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: res.statusText || responseText.substring(0, 200) };
        }
        console.error("❌ API Error Response:", errorData);
        const errorMsg = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError);
        console.error("❌ Response text:", responseText);
        throw new Error("Response bukan format JSON yang valid");
      }
      
      console.log("✅ Response data:", data);
      return data;
    } catch (err) {
      console.error("❌ Fetch error:", err);
      console.error("❌ Error type:", err.constructor.name);
      throw err;
    }
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

  // ---------- Render nota dengan UI yang lebih baik ----------
function renderNotaBlock(tx, currentUserId) {
  const judul = tx.type === "IN" ? "Transaksi Masuk" : "Transaksi Keluar";
  const typeColor = tx.type === "IN" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300";
  
  // Tentukan username yang akan ditampilkan (sama seperti di stock log)
  let akun = "-";
  if (tx.akun && tx.akun !== "System" && tx.akun !== "Unknown" && tx.akun !== null && tx.akun !== "" && tx.akun !== undefined) {
    akun = tx.akun;
  } else if (tx.username && tx.username !== "System" && tx.username !== "Unknown" && tx.username !== null && tx.username !== "" && tx.username !== undefined) {
    akun = tx.username;
  } else if (tx.user_id) {
    akun = `User-${tx.user_id}`;
  }

  // Highlight jika current user
  const isCurrentUser = currentUserId && (tx.user_id === currentUserId);
  const userClass = isCurrentUser ? "text-pink-600 font-semibold" : "";
  const borderClass = isCurrentUser ? "border-pink-300" : "border-pink-200";
  
  const itemsRows = tx.items
    .map(it => {
      const nama   = String(it.nama || "-");
      const jumlah = it.qty ?? "-";
      const harga  = it.harga != null ? rupiah(it.harga) : "-";
      const total  = it.total != null ? rupiah(it.total) : "-";

      return `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
          <td class="py-3 px-4 text-gray-800">${nama}</td>
          <td class="py-3 px-4 text-center text-gray-700">${jumlah}</td>
          <td class="py-3 px-4 text-right text-gray-700">${harga}</td>
          <td class="py-3 px-4 text-right font-semibold text-gray-800">${total}</td>
        </tr>
      `;
    })
    .join("");

  const grandTotal = tx.total != null ? rupiah(tx.total) : "-";

  return `
<div class="bg-white rounded-lg shadow-md border ${borderClass} overflow-hidden">
  <div class="bg-gradient-to-r from-pink-50 to-pink-100 px-6 py-4 border-b border-pink-200">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-pink-700">${judul}</h3>
        <p class="text-sm text-gray-600 mt-1">ID: <span class="font-mono text-pink-600">#${tx.id}</span></p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-semibold border ${typeColor}">
        ${tx.type}
      </span>
    </div>
  </div>
  
  <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div>
        <span class="text-gray-500">Tanggal:</span>
        <span class="ml-2 font-medium text-gray-800">${tx.tanggal}</span>
      </div>
      ${tx.type === "IN" && tx.supplier ? `
      <div>
        <span class="text-gray-500">Supplier:</span>
        <span class="ml-2 font-medium text-gray-800">${tx.supplier}</span>
      </div>
      ` : ''}
      <div>
        <span class="text-gray-500">User:</span>
        <span class="ml-2 font-medium ${userClass}">${akun}</span>
      </div>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="min-w-full">
      <thead class="bg-gray-100">
        <tr>
          <th class="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Produk</th>
          <th class="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Jumlah</th>
          <th class="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Harga Satuan</th>
          <th class="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
        </tr>
      </thead>
      <tbody class="bg-white">
        ${itemsRows || '<tr><td colspan="4" class="py-4 text-center text-gray-500">Tidak ada item</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="bg-pink-50 px-6 py-4 border-t border-pink-200">
    <div class="flex justify-end items-center">
      <span class="text-gray-600 mr-4 font-medium">Total:</span>
      <span class="text-2xl font-bold text-pink-600">${grandTotal}</span>
    </div>
  </div>
</div>
`;
}



  function fillNotaHistory(groupedArr, currentUserId) {
    if (!notaList) return;
    if (!groupedArr.length) {
      notaList.innerHTML =
        '<p class="text-gray-400">Belum ada transaksi keluar yang bisa ditampilkan sebagai nota.</p>';
      return;
    }

    notaList.innerHTML = groupedArr.map(tx => renderNotaBlock(tx, currentUserId)).join("");
  }

  // ============================
  // SEARCH + FILTER (SISIPAN)
  // - minimal changes, hanya sisipkan fungsi dan state
  // ============================
  const txSearch = document.getElementById("txSearch"); // pastikan ada di HTML
  let allRows = []; // akan diisi saat loadHistory
  let activeFilter = "ALL"; // ALL | IN | OUT

  function txMatchesSearch(tx, q) {
    if (!q) return true;
    q = q.toLowerCase();

    const fields = [
      tx.transaksiId, tx.id, tx.tranid,
      tx.namaItem, tx.itemName, tx.item,
      tx.catatan, tx.note,
      tx.akun, tx.username,
      tx.tipe, tx.type,
      getSupplierNameForTx(tx)
    ];

    return fields.some(f => String(f || "").toLowerCase().includes(q));
  }

  function getFilteredRows() {
    const q = (txSearch?.value || "").trim().toLowerCase();
    return allRows.filter((t) => {
      const type = String((t.tipe || t.type || "")).toUpperCase();
      if (activeFilter === "IN" && type !== "IN") return false;
      if (activeFilter === "OUT" && type !== "OUT") return false;
      return txMatchesSearch(t, q);
    });
  }

  function updateFilterChipVisuals() {
    document.querySelectorAll(".tx-filter-chip").forEach((c) => {
      const f = c.dataset.filter || "ALL";
      if (f === activeFilter) {
        c.classList.add("bg-pink-500", "text-white");
        c.classList.remove("text-pink-600");
      } else {
        c.classList.remove("bg-pink-500", "text-white");
        c.classList.add("text-pink-600");
      }
    });
  }

  // register chips if ada
  document.querySelectorAll(".tx-filter-chip").forEach((c) => {
    c.addEventListener("click", () => {
      const f = c.dataset.filter || "ALL";
      // toggle: klik ulang kembali ke ALL
      activeFilter = (activeFilter === f) ? "ALL" : f;
      updateFilterChipVisuals();
      renderFilteredView();
    });
  });

  // register search input
  txSearch?.addEventListener("input", () => {
    renderFilteredView();
  });

  // Update header tabel berdasarkan filter
  function updateTableHeader() {
    const thead = document.querySelector("#stockLogContainer thead tr");
    if (!thead) return;
    
    const isOutFilter = activeFilter === "OUT";
    
    if (isOutFilter) {
      // Hapus kolom Supplier untuk filter OUT
      thead.innerHTML = `
        <th class="py-2 pr-4">Username</th>
        <th class="py-2 pr-4">Transaksi ID</th>
        <th class="py-2 pr-4">Tanggal</th>
        <th class="py-2 pr-4">Tipe</th>
        <th class="py-2 pr-4">Barang</th>
        <th class="py-2 pr-4">Qty</th>
        <th class="py-2 pr-4">Catatan</th>
      `;
    } else {
      // Tampilkan kolom Supplier untuk filter ALL atau IN
      thead.innerHTML = `
        <th class="py-2 pr-4">Username</th>
        <th class="py-2 pr-4">Transaksi ID</th>
        <th class="py-2 pr-4">Tanggal</th>
        <th class="py-2 pr-4">Tipe</th>
        <th class="py-2 pr-4">Barang</th>
        <th class="py-2 pr-4">Qty</th>
        <th class="py-2 pr-4">Supplier</th>
        <th class="py-2 pr-4">Catatan</th>
      `;
    }
  }

  // render berdasarkan filter & search
  function renderFilteredView() {
    // gunakan logic render dari bagian loadHistory (mirip)
    if (!tbodyHist) return;
    const rows = getFilteredRows();
    
    // Update header berdasarkan filter
    updateTableHeader();
    
    const isOutFilter = activeFilter === "OUT";
    const colCount = isOutFilter ? 7 : 8;

    // STOCK LOG TABLE render
    if (!Array.isArray(rows) || rows.length === 0) {
      tbodyHist.innerHTML =
        `<tr><td colspan="${colCount}" class="py-4 text-gray-500">Belum ada riwayat transaksi sesuai filter / pencarian.</td></tr>`;
    } else {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = currentUser.id;

      tbodyHist.innerHTML = rows
        .map((t, idx) => {
          let akun = "-";
          if (t.akun && t.akun !== "System" && t.akun !== "Unknown" && t.akun !== null && t.akun !== "" && t.akun !== undefined) {
            akun = t.akun;
          } else if (t.username && t.username !== "System" && t.username !== "Unknown" && t.username !== null && t.username !== "" && t.username !== undefined) {
            akun = t.username;
          } else if (t.user_id) {
            akun = `User-${t.user_id}`;
          }

          const transaksiId = t.transaksiId || t.id || t.tranid || "-";
          const tanggal = t.tanggal || t.date || "-";
          const tipeRaw = (t.tipe || t.type || "-").toUpperCase();
          const tipeCls =
            (t.tipe || t.type) === "OUT" ? "text-red-600" : "text-green-600";
          const namaItem = t.namaItem || t.itemName || t.item || "-";
          const qty = t.qty ?? t.jumlah ?? "-";
          const note = t.catatan || t.note || "-";

          const isCurrentUser =
            currentUserId && (t.userId === currentUserId || t.user_id === currentUserId);
          const rowClass = isCurrentUser ? "border-t bg-pink-50" : "border-t";

          if (isOutFilter) {
            // Untuk filter OUT, tidak tampilkan kolom Supplier
            return `
              <tr class="${rowClass}">
                <td class="py-2 pr-4 font-semibold ${isCurrentUser ? "text-pink-600" : ""}">${akun}</td>
                <td class="py-2 pr-4 font-mono text-xs">${transaksiId}</td>
                <td class="py-2 pr-4">${tanggal}</td>
                <td class="py-2 pr-4 ${tipeCls}">${tipeRaw}</td>
                <td class="py-2 pr-4">${namaItem}</td>
                <td class="py-2 pr-4">${qty}</td>
                <td class="py-2 pr-4">${note}</td>
              </tr>
            `;
          } else {
            // Untuk filter ALL atau IN, tampilkan kolom Supplier (dengan "-" untuk OUT)
            const supplierName = (tipeRaw === "IN") ? getSupplierNameForTx(t) : "-";
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
          }
        })
        .join("");
    }

    // HISTORY NOTA render (grouped)
    const grouped = {};
    rows.forEach((t) => {
      const type = (t.tipe || t.type || "").toUpperCase();
      const idTx = t.transaksiId || t.tranid || t.id;
      if (!idTx) return;

      if (!grouped[idTx]) {
        let akun = "-";
        if (t.akun && t.akun !== "System" && t.akun !== "Unknown" && t.akun !== null && t.akun !== "" && t.akun !== undefined) {
          akun = t.akun;
        } else if (t.username && t.username !== "System" && t.username !== "Unknown" && t.username !== null && t.username !== "" && t.username !== undefined) {
          akun = t.username;
        } else if (t.user_id) {
          akun = `User-${t.user_id}`;
        }

        // Hanya simpan supplier untuk transaksi IN
        const supplier = (type === "OUT") ? null : getSupplierNameForTx(t);
        
        grouped[idTx] = {
          id: idTx,
          tanggal: t.tanggal || t.date || "-",
          supplier: supplier,
          type,
          items: [],
          total: 0,
          akun: akun,
          username: t.username || t.akun || null,
          user_id: t.user_id || null,
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
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    fillNotaHistory(groupedArr, currentUser.id);
  }

  // ---------- Load history + supplier name + nota ----------
  (async function loadHistory() {
    if (!tbodyHist) return;

    // Ambil user yang login dulu (untuk highlight row-nya saja)
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = currentUser.id;

    // pastikan map produk & supplier sudah ada
    await ensureMetaLoaded();

    try {
      console.log("🔄 Loading transactions from:", `${API}/transactions`);
      const resp = await getJSON(`${API}/transactions`);
      console.log("📥 Full API response from /transactions:", resp);
      console.log("📥 Response keys:", Object.keys(resp || {}));
      
      // Handle berbagai format response
      let rows = [];
      if (resp) {
        if (Array.isArray(resp)) {
          rows = resp;
          console.log("✅ Response is direct array");
        } else if (resp.transactions && Array.isArray(resp.transactions)) {
          rows = resp.transactions;
          console.log("✅ Found transactions array, length:", rows.length);
        } else if (resp.data && Array.isArray(resp.data)) {
          rows = resp.data;
          console.log("✅ Found data array, length:", rows.length);
        } else if (resp.items && Array.isArray(resp.items)) {
          rows = resp.items;
          console.log("✅ Found items array, length:", rows.length);
        } else {
          console.warn("⚠️ Unexpected response format. Response keys:", Object.keys(resp));
          console.warn("⚠️ Response content:", JSON.stringify(resp).substring(0, 200));
          
          // Jika response berisi data dashboard (totalItem, totalStok, dll), berarti endpoint salah
          if (resp.totalItem !== undefined || resp.totalStok !== undefined) {
            throw new Error("Endpoint /transactions mengembalikan data dashboard. Pastikan backend route sudah benar.");
          }
          
          // Coba ambil semua property yang mungkin array
          for (const key in resp) {
            if (Array.isArray(resp[key])) {
              rows = resp[key];
              console.log(`✅ Found array in property: ${key}, length:`, rows.length);
              break;
            }
          }
        }
      }
      
      if (!Array.isArray(rows)) {
        console.error("❌ Response is not an array:", typeof rows);
        console.error("❌ Response content:", JSON.stringify(resp).substring(0, 300));
        throw new Error("Format data tidak valid dari server. Endpoint /transactions harus mengembalikan array transaksi. Response: " + JSON.stringify(resp).substring(0, 200));
      }

      console.log("📊 Total rows received:", rows.length);
      
      if (rows.length > 0) {
        console.log("🔍 First row data:", {
          transaksiId: rows[0].transaksiId,
          user_id: rows[0].user_id,
          username: rows[0].username,
          akun: rows[0].akun,
          userId: rows[0].userId
        });
      }

      if (rows.length === 0) {
        const colCount = activeFilter === "OUT" ? 7 : 8;
        tbodyHist.innerHTML =
          `<tr><td colspan="${colCount}" class="py-4 text-gray-500">Belum ada riwayat transaksi.</td></tr>`;
        fillNotaHistory([], currentUserId);
        return;
      }

      // Simpan semua rows ke state (dipakai search/filter)
      allRows = rows;

      // initial render: gunakan filtered renderer
      updateFilterChipVisuals();
      updateTableHeader(); // Update header berdasarkan filter aktif sebelum render
      renderFilteredView();
    } catch (e) {
      console.error("❌ Gagal load history:", e);
      console.error("❌ Error name:", e.name);
      console.error("❌ Error message:", e.message);
      console.error("❌ Error stack:", e.stack);
      
      const colCount = activeFilter === "OUT" ? 7 : 8;
      let errorMsg = "Gagal memuat data transaksi";
      let errorDetail = "";
      
      if (e.name === "TypeError" && (e.message && (e.message.includes("fetch") || e.message.includes("Failed to fetch") || e.message.includes("NetworkError")))) {
        errorMsg = "Tidak dapat terhubung ke server";
        errorDetail = "Pastikan backend berjalan di http://localhost:3000 dan tidak ada masalah CORS";
      } else if (e.message) {
        errorMsg = e.message;
        if (e.message.includes("500") || e.message.includes("Internal Server Error")) {
          errorMsg = "Server Error (500) - Backend Error";
          errorDetail = "Backend mengalami error saat memproses request. Kemungkinan masalah:\n- Kolom database tidak ada (misal: transaction_date)\n- Query SQL error\n- Koneksi database bermasalah\n\nCek console backend untuk detail error SQL.";
        } else if (e.message.includes("404") || e.message.includes("Not Found")) {
          errorMsg = "Endpoint tidak ditemukan (404)";
          errorDetail = "Endpoint /transactions tidak ditemukan. Pastikan route sudah benar di backend";
        } else if (e.message.includes("403") || e.message.includes("Forbidden")) {
          errorMsg = "Akses ditolak (403)";
          errorDetail = "Tidak memiliki izin untuk mengakses endpoint ini";
        } else if (e.message.includes("401") || e.message.includes("Unauthorized")) {
          errorMsg = "Tidak terautentikasi (401)";
          errorDetail = "Silakan login ulang";
        } else if (e.message.includes("HTTP") || e.message.includes("status")) {
          errorDetail = "Error dari server. Status: " + e.message;
        } else if (e.message.includes("JSON") || e.message.includes("parse")) {
          errorMsg = "Format data tidak valid";
          errorDetail = "Response dari server bukan format JSON yang valid";
        }
      } else {
        errorMsg = "Unknown error: " + (e.toString ? e.toString() : String(e));
      }
      
      tbodyHist.innerHTML =
        `<tr><td colspan="${colCount}" class="py-4 text-red-500 text-center">
          <div class="font-semibold text-lg mb-2">⚠️ Error: ${errorMsg}</div>
          ${errorDetail ? `<div class="text-sm text-gray-600 mb-1">${errorDetail}</div>` : ''}
          <div class="text-xs text-gray-500 mt-1">Buka Developer Tools (F12) → Console untuk detail error</div>
        </td></tr>`;
      fillNotaHistory([], currentUserId);
    }
  })();
  
  } catch (globalError) {
    console.error("❌ Global error in transaction.js:", globalError);
    const errorContainer = document.getElementById("historyBody") || document.querySelector("tbody");
    if (errorContainer) {
      errorContainer.innerHTML = `<tr><td colspan="8" class="py-4 text-red-500 text-center">
        <div class="font-semibold">⚠️ Error: Script tidak dapat dijalankan</div>
        <div class="text-sm text-gray-600 mt-1">${globalError.message || "Unknown error"}</div>
      </td></tr>`;
    }
  }
});

// ====== Print History Button ======
const printBtn = document.getElementById("btnPrintHistory");
if (printBtn) {
  printBtn.addEventListener("click", () => {
    document.getElementById("notaContainer").classList.remove("hidden");
    window.print();
  });
}

// ====== Profile Modal + Mobile Menu (from transaction.html) ======
(function() {
  const API = "http://localhost:3000";
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileClose');
  const profileLogout = document.getElementById('profileLogout');
  const profileSave = document.getElementById('profileSave');
  const profileCancel = document.getElementById('profileCancel');
  const profileError = document.getElementById('profileError');
  const sidebarUsername = document.getElementById('sidebarUsername');
  const profileFotoInput = document.getElementById('profileFotoInput');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileAvatarContainer = document.getElementById('profileAvatarContainer');
  const profilePlaceholder = document.getElementById('profileAvatarPlaceholder');

  function openProfile() {
    if (profileError) {
      profileError.classList.add('hidden');
      profileError.textContent = '';
    }
    if (profileFotoInput) profileFotoInput.value = '';

    const u = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('profileId').textContent = u.id || '-';
    document.getElementById('profileUsernameInput').value = u.username || '';
    document.getElementById('profileEmailInput').value = u.email || '';
    document.getElementById('profilePasswordInput').value = '';

    const avatarFilename = u.avatar || null;
    const pImg = document.getElementById('profileAvatar');
    const pPlaceholder = document.getElementById('profileAvatarPlaceholder');

    if (avatarFilename) {
      const avatarUrl = `${API}/uploads/${avatarFilename}`;
      if (pImg) {
        pImg.src = avatarUrl;
        pImg.classList.remove('hidden');
      }
      if (pPlaceholder) pPlaceholder.classList.add('hidden');
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    } else {
      if (pImg) pImg.classList.add('hidden');
      if (pPlaceholder) pPlaceholder.classList.remove('hidden');
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = '👤';
    }

    if (profileModal) {
      profileModal.classList.remove('hidden');
      profileModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeProfile() {
    if (profileModal) {
      profileModal.classList.add('hidden');
      profileModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  profileBtn?.addEventListener('click', (e) => { e.preventDefault(); openProfile(); });
  profileClose?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileCancel?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });

  profileLogout?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('user'); window.location.href = '../src/login.html'; });

  profileSave?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (profileError) profileError.classList.add('hidden');
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const id = currentUser.id;

    const usernameVal = document.getElementById('profileUsernameInput').value.trim();
    const emailVal = document.getElementById('profileEmailInput').value.trim();
    const passwordVal = document.getElementById('profilePasswordInput').value;
    const newFoto = document.getElementById('profileFotoInput').files[0];

    if (!id) {
      if (profileError) {
        profileError.textContent = 'Error: User ID tidak ditemukan di penyimpanan lokal. Silakan coba login ulang.';
        profileError.classList.remove('hidden');
      }
      return;
    }

    if (!usernameVal || !emailVal) {
      if (profileError) {
        profileError.textContent = 'Username dan email wajib diisi.';
        profileError.classList.remove('hidden');
      }
      return;
    }

    const fd = new FormData();
    fd.append("id", id);
    fd.append("username", usernameVal);
    fd.append("email", emailVal);
    if (passwordVal) fd.append("password", passwordVal);
    if (newFoto) fd.append("foto", newFoto);

    const profileSaveBtn = e.target;
    const prevText = profileSaveBtn.textContent;
    profileSaveBtn.disabled = true;
    profileSaveBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`${API}/login/profile`, {
        method: 'PATCH',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        if (profileError) {
          profileError.textContent = data.message || 'Gagal memperbarui profile.';
          profileError.classList.remove('hidden');
        }
        return;
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      const sb = document.getElementById('sidebarUsername');
      if (sb) sb.textContent = data.user.username;
      
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) {
          if (data.user.avatar) {
              const avatarUrl = `${API}/uploads/${data.user.avatar}`;
              profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
              const pImg = document.getElementById('profileAvatar');
              const pPlaceholder = document.getElementById('profileAvatarPlaceholder');
              if (pImg && pPlaceholder) {
                pImg.src = avatarUrl;
                pImg.classList.remove('hidden');
                pPlaceholder.classList.add('hidden');
              }
          } else {
              profileBtn.innerHTML = '👤';
          }
      }
      
      alert('Profil berhasil diperbarui!');
      closeProfile();
    } catch (err) {
      if (profileError) {
        profileError.textContent = 'Terjadi kesalahan koneksi.';
        profileError.classList.remove('hidden');
      }
    } finally {
      profileSaveBtn.disabled = false;
      profileSaveBtn.textContent = prevText;
    }
  });

  profileAvatarContainer?.addEventListener('click', () => {
    profileFotoInput?.click();
  });

  // Load profile avatar on page load
  (function() {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn && u.avatar) {
      const avatarUrl = `${API}/uploads/${u.avatar}`;
      profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    }
  })();
})();

// ====== Mobile Menu Functionality ======
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (!mobileMenuBtn || !sidebar || !mobileOverlay) {
    console.error('Mobile menu elements not found');
    return;
  }

  function openSidebar() {
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      sidebar.style.display = 'flex';
      sidebar.style.visibility = 'visible';
      sidebar.style.opacity = '1';
    }
    if (mobileOverlay) mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openSidebar();
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    });
  }

  document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
  });
});