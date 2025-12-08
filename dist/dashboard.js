window.addEventListener("DOMContentLoaded", async () => {
  const elItem  = document.getElementById("totalItem");
  const elStok  = document.getElementById("totalStok");
  const elHarga = document.getElementById("totalHarga");
  const elError = document.getElementById("dashboardError");

  const listProductsEl  = document.getElementById("listProducts");
  const listSuppliersEl = document.getElementById("listSuppliers");

  const tabProducts  = document.getElementById("tabProducts");
  const tabSuppliers = document.getElementById("tabSuppliers");

  const showAddSupplierBtn = document.getElementById("showAddSupplierBtn");
  const supplierTools      = document.getElementById("supplierTools");
  const addSupplierBox     = document.getElementById("addSupplierBox");
  const addSupplierForm    = document.getElementById("addSupplierForm");
  const addSupplierError   = document.getElementById("addSupplierError");
  const cancelAddSupplier  = document.getElementById("cancelAddSupplier");


  const API = "http://localhost:3000";
  const rupiah = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const FALLBACK_IMG =
    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg";

  function resolveImg(p) {
    if (!p?.foto) return FALLBACK_IMG;
    if (/^https?:\/\//i.test(p.foto)) return p.foto;
    return `${API}${p.foto}`;
  }

  function itemRow(p) {
    const src = resolveImg(p);
    return `
      <li class="bg-white rounded-lg shadow border p-3 flex items-center gap-3">
        <img src="${src}" alt="${p.namaItem ?? "-"}"
             class="h-10 w-10 object-contain rounded-md"
             onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
        <span class="font-medium">${p.namaItem ?? "-"}</span>
      </li>
    `;
  }

  // --- SUPPLIER ROW: nama + kontak + alamat ---
  function supplierRow(s) {
    const name   = s?.namaSupplier || s?.nama || s?.name || "-";
    const kontak = s?.kontak || s?.telepon || s?.phone || "-";
    const alamat = s?.alamat || s?.address || "-";

    return `
      <li class="bg-white rounded-lg shadow border p-3 flex items-center gap-3">
        <span class="text-2xl">🏷️</span>
        <div class="flex-1">
          <div class="font-medium">${name}</div>
          <div class="text-sm text-gray-600">Telp: ${kontak}</div>
          <div class="text-xs text-gray-500">${alamat}</div>
        </div>
      </li>
    `;
  }

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res.json();
  }

  let cachedItems = [];
  let cachedSuppliers = null; // null = belum pernah load
  let dashCache   = { totalItem: 0, totalStok: 0, totalHarga: 0 };

  // cache statistik tambahan (untuk print + summary)
  let extraStatsCache = {
    totalKategori: 0,
    totalSupplier: 0,
    txToday: 0,
    incomeToday: 0,
    outcomeToday: 0,
    profitToday: 0,
  };

  // ------- Initial load: dashboard + products (dipisah supaya tidak saling merusak) -------
try {
  const dash = await getJSON(`${API}/dashboard`);

  // Update dashboard
  dashCache = {
    totalItem : dash.totalItem  ?? 0,
    totalStok : dash.totalStok  ?? 0,
    totalHarga: dash.totalHarga ?? 0,
    totalKategori: dash.totalKategori ?? 0
  };

  if (elItem)  elItem.textContent  = dashCache.totalItem;
  if (elStok)  elStok.textContent  = dashCache.totalStok;
  if (elHarga) elHarga.textContent = rupiah(dashCache.totalHarga);

  // Update kategori langsung dari backend
  const statKategoriEl = document.getElementById("statKategori");
  if (statKategoriEl) {
    statKategoriEl.textContent = dashCache.totalKategori;
    extraStatsCache.totalKategori = dashCache.totalKategori;
  }

  if (elError) elError.textContent = "";
} catch (err) {
  if (elError) elError.textContent = err.message || "Gagal memuat dashboard";
  console.error("Dashboard error:", err);
}

// Load list products (AMAN dari error dashboard)
if (listProductsEl) {
  try {
    const itemsRes = await getJSON(`${API}/items`);
    const items = itemsRes.items || itemsRes || [];
    cachedItems = items;
    listProductsEl.innerHTML = items.map(itemRow).join("");
  } catch (err) {
    listProductsEl.innerHTML =
      `<li class="text-red-600">${err.message || "Gagal memuat produk"}</li>`;
  }
}

  // ------- Tabs behavior -------
  function setActiveTab(tab) {
    const activeAdd       = ["bg-pink-500","text-white"];
    const activeRemove    = ["text-pink-600","hover:bg-pink-50"];
    const inactiveAdd     = ["text-pink-600","hover:bg-pink-50"];
    const inactiveRemove  = ["bg-pink-500","text-white"];

    if (tab === "products") {
      // products -> aktif
      tabProducts.classList.add(...activeAdd);
      tabProducts.classList.remove(...activeRemove);
      // suppliers -> non-aktif
      tabSuppliers.classList.add(...inactiveAdd);
      tabSuppliers.classList.remove(...inactiveRemove);

      listProductsEl?.classList.remove("hidden");
      listSuppliersEl?.classList.add("hidden");

      // alat supplier di-hide
      supplierTools?.classList.add("hidden");
      addSupplierBox?.classList.add("hidden");
    } else if (tab === "suppliers") {
      // suppliers -> aktif
      tabSuppliers.classList.add(...activeAdd);
      tabSuppliers.classList.remove(...activeRemove);
      // products -> non-aktif
      tabProducts.classList.add(...inactiveAdd);
      tabProducts.classList.remove(...inactiveRemove);

      listSuppliersEl?.classList.remove("hidden");
      listProductsEl?.classList.add("hidden");

      // alat supplier hanya muncul di tab ini
      supplierTools?.classList.remove("hidden");
      addSupplierBox?.classList.add("hidden"); // form hanya muncul kalau tombol + diklik
    }
  }


async function ensureSuppliersLoaded() {
  if (!listSuppliersEl) return;

  // Kalau data supplier sudah ada di cache, tinggal render ke UI
  if (cachedSuppliers !== null) {
    const suppliers = cachedSuppliers;

    if (!suppliers || suppliers.length === 0) {
      listSuppliersEl.innerHTML =
        `<li class="text-gray-500">Belum ada data supplier.</li>`;
    } else {
      listSuppliersEl.innerHTML = suppliers.map(supplierRow).join("");
    }
    return;
  }

  // Kalau belum pernah load sama sekali, fetch ke backend
  try {
    const resp = await getJSON(`${API}/suppliers`);
    const suppliers = resp?.suppliers || resp || [];
    cachedSuppliers = suppliers;

    if (suppliers.length === 0) {
      listSuppliersEl.innerHTML =
        `<li class="text-gray-500">Belum ada data supplier.</li>`;
    } else {
      listSuppliersEl.innerHTML = suppliers.map(supplierRow).join("");
    }
  } catch (e) {
    cachedSuppliers = []; // tandai sudah coba, tapi gagal
    listSuppliersEl.innerHTML =
      `<li class="text-gray-500">
        Belum ada data supplier atau endpoint belum tersedia.
      </li>`;
  }
}

  showAddSupplierBtn?.addEventListener("click", () => {
    if (!addSupplierBox) return;
    addSupplierForm?.reset();
    if (addSupplierError) {
      addSupplierError.textContent = "";
      addSupplierError.classList.add("hidden");
    }
    addSupplierBox.classList.remove("hidden");
  });

  cancelAddSupplier?.addEventListener("click", () => {
    addSupplierBox?.classList.add("hidden");
  });

  addSupplierForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!addSupplierForm) return;

    const formData = new FormData(addSupplierForm);
    const payload = {
      namaSupplier: (formData.get("namaSupplier") || "").toString().trim(),
      kontak: (formData.get("kontak") || "").toString().trim(),
      alamat: (formData.get("alamat") || "").toString().trim(),
    };

    if (!payload.namaSupplier) {
      if (addSupplierError) {
        addSupplierError.textContent = "Nama supplier wajib diisi.";
        addSupplierError.classList.remove("hidden");
      }
      return;
    }

    try {
      if (addSupplierError) addSupplierError.classList.add("hidden");

      const res = await fetch(`${API}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Gagal menambah supplier (${res.status})`);
      }

      const data = await res.json();
      const newSupplier = data.supplier || data.data || data;

      // update cache & list
      if (!Array.isArray(cachedSuppliers)) cachedSuppliers = [];
      cachedSuppliers.push(newSupplier);
      if (listSuppliersEl) {
        listSuppliersEl.innerHTML = cachedSuppliers.map(supplierRow).join("");
      }

      addSupplierForm.reset();
      addSupplierBox?.classList.add("hidden");
    } catch (err) {
      console.error(err);
      if (addSupplierError) {
        addSupplierError.textContent =
          err.message || "Terjadi kesalahan saat menambah supplier.";
        addSupplierError.classList.remove("hidden");
      }
    }
  });

  tabProducts?.addEventListener("click", () => setActiveTab("products"));
  tabSuppliers?.addEventListener("click", async () => {
    await ensureSuppliersLoaded();
    setActiveTab("suppliers");
  });

  // default: products tab
  setActiveTab("products");

  // ------- Print (produk saja) -------
  function fillPrintSummary(dash, extra = extraStatsCache) {
    const pItem   = document.getElementById("pTotalItem");
    const pStok   = document.getElementById("pTotalStok");
    const pHarga  = document.getElementById("pTotalHarga");

    const pKategori = document.getElementById("pTotalKategori");
    const pSupplier = document.getElementById("pTotalSupplier");
    const pTxToday  = document.getElementById("pTxToday");

    const pIncome  = document.getElementById("pIncomeToday");
    const pOutcome = document.getElementById("pOutcomeToday");
    const pProfit  = document.getElementById("pProfitToday");

    if (pItem)   pItem.textContent   = dash.totalItem;
    if (pStok)   pStok.textContent   = dash.totalStok;
    if (pHarga)  pHarga.textContent  = rupiah(dash.totalHarga);

    if (pKategori) pKategori.textContent = extra.totalKategori ?? "-";
    if (pSupplier) pSupplier.textContent = extra.totalSupplier ?? "-";
    if (pTxToday)  pTxToday.textContent  = extra.txToday ?? "-";

    if (pIncome)  pIncome.textContent  = rupiah(extra.incomeToday ?? 0);
    if (pOutcome) pOutcome.textContent = rupiah(extra.outcomeToday ?? 0);
    if (pProfit)  pProfit.textContent  = rupiah(extra.profitToday ?? 0);
  }

function buildPrintTable(items) {
  const tbody = document.querySelector("#printTable tbody");
  if (!tbody) return;

  // Buat map supid -> object supplier
  const supplierMap = {};
  if (Array.isArray(cachedSuppliers)) {
    cachedSuppliers.forEach((s) => {
      const key = s.supid ?? s.id ?? s.supplierId ?? s.idSupplier;
      if (key != null) {
        supplierMap[String(key)] = s;
      }
    });
  }

  tbody.innerHTML = items
    .map((p, i) => {
      // coba pakai nama yang sudah di-join dulu (kalau memang ada)
      let supplierName =
        p.namaSupplier ||
        p.supplierName ||
        p.supplier ||
        "";

      // kalau belum ada nama, coba cari berdasarkan id supplier di item
      if (!supplierName && Object.keys(supplierMap).length > 0) {
        const supKey =
          p.supid ??
          p.supplierId ??
          p.idSupplier ??
          p.id_supplier ??
          null;

        if (supKey != null && supplierMap[String(supKey)]) {
          const s = supplierMap[String(supKey)];
          supplierName =
            s.namaSupplier ||
            s.nama ||
            s.name ||
            s.supplierName ||
            "";
        }
      }

      if (!supplierName) supplierName = "-";

      return `
        <tr>
          <td class="border px-3 py-2">${i + 1}</td>
          <td class="border px-3 py-2">${p.namaItem ?? "-"}</td>
          <td class="border px-3 py-2">${p.keterangan ?? "-"}</td>
          <td class="border px-3 py-2">${supplierName}</td>
          <td class="border px-3 py-2">${rupiah(p.hargaSatuan)}</td>
          <td class="border px-3 py-2">${p.stok ?? 0}</td>
        </tr>
      `;
    })
    .join("");
}


  // ====== Statistik Tambahan ======
  async function loadExtraStats() {
    const statKategoriEl     = document.getElementById("statKategori");
    const statSupplierEl     = document.getElementById("statSupplier");
    const statTxTodayEl      = document.getElementById("statTxToday");
    const statIncomeTodayEl  = document.getElementById("statIncomeToday");
    const statOutcomeTodayEl = document.getElementById("statOutcomeToday");
    const statProfitTodayEl  = document.getElementById("statProfitToday");
    const stockAlertEl       = document.getElementById("stockAlert");
    const chartWeeklyEl      = document.getElementById("chartWeekly");
    const chartPopularEl     = document.getElementById("chartPopular");
    const lowStockListEl     = document.getElementById("lowStockList");

    // kalau semua elemen ini tidak ada (misal file dipakai di halaman lain), jangan lanjut
    if (
      !statKategoriEl &&
      !statSupplierEl &&
      !statTxTodayEl &&
      !statIncomeTodayEl &&
      !statOutcomeTodayEl &&
      !statProfitTodayEl &&
      !stockAlertEl &&
      !chartWeeklyEl &&
      !chartPopularEl &&
      !lowStockListEl
    ) {
      return;
    }

    try {
      // Gunakan endpoint backend yang tersedia
      const [itemsRes, suppliersRes, txTodayRes, txSummaryTodayRes, txRes] = await Promise.all([
        getJSON(`${API}/items`),
        getJSON(`${API}/suppliers`),
        getJSON(`${API}/transactions/today`).catch(() => ({ total: 0 })),
        getJSON(`${API}/transactions/summary/today`).catch(() => ({ pemasukan: 0, pengeluaran: 0, profit: 0 })),
        getJSON(`${API}/transactions`).catch(() => ({ transactions: [] })),
      ]);

const items = itemsRes.items || itemsRes || [];
const suppliers = suppliersRes.suppliers || suppliersRes || [];
cachedSuppliers = suppliers;
const txRows =
  txRes.transactions || txRes.items || txRes.data || txRes || [];


      // --- Summary: kategori, supplier ---
      // Kategori sudah diambil dari /dashboard, skip jika sudah ada
      if (statKategoriEl && (!statKategoriEl.textContent || statKategoriEl.textContent === "...")) {
        const kategoriSet = new Set(
          items
            .map((i) => i.namaKategori || i.kategori || i.category)
            .filter(Boolean)
        );
        const totalKategori = kategoriSet.size;
        extraStatsCache.totalKategori = totalKategori;
        statKategoriEl.textContent = totalKategori;
      }

      const totalSupplier = suppliers.length;
      extraStatsCache.totalSupplier = totalSupplier;
      if (statSupplierEl) {
        statSupplierEl.textContent = totalSupplier;
      }

      // --- Transaksi hari ini dari endpoint backend ---
      const txTodayCount = txTodayRes.total || 0;
      extraStatsCache.txToday = txTodayCount;
      if (statTxTodayEl) {
        statTxTodayEl.textContent = txTodayCount;
      }

      // --- Pemasukan, pengeluaran, profit dari endpoint summary today ---
      // Backend sudah benar: pemasukan = OUT (penjualan), pengeluaran = IN (pembelian)
      const incomeToday = txSummaryTodayRes.pemasukan || 0;  // OUT = penjualan = pemasukan
      const outcomeToday = txSummaryTodayRes.pengeluaran || 0;  // IN = pembelian = pengeluaran
      const profitToday = txSummaryTodayRes.profit || (incomeToday - outcomeToday);

      extraStatsCache.incomeToday = incomeToday;
      extraStatsCache.outcomeToday = outcomeToday;
      extraStatsCache.profitToday = profitToday;

      if (statIncomeTodayEl) {
        statIncomeTodayEl.textContent = rupiah(incomeToday);
      }
      if (statOutcomeTodayEl) {
        statOutcomeTodayEl.textContent = rupiah(outcomeToday);
      }
      if (statProfitTodayEl) {
        statProfitTodayEl.textContent = rupiah(profitToday);
      }

      // --- Alert stok < 5 + daftar barang stok < 5 ---
      const lowStock = items.filter(
        (p) => Number(p.stok ?? p.stock ?? 0) < 5
      );

      if (stockAlertEl) {
        if (lowStock.length > 0) {
          stockAlertEl.classList.remove("hidden");
        } else {
          stockAlertEl.classList.add("hidden");
        }
      }

      if (lowStockListEl) {
        if (lowStock.length === 0) {
          lowStockListEl.innerHTML =
            '<li class="text-gray-500">Semua stok aman (≥ 5).</li>';
        } else {
          const rows = lowStock
            .slice()
            .sort(
              (a, b) =>
                Number(a.stok ?? a.stock ?? 0) -
                Number(b.stok ?? b.stock ?? 0)
            )
            .map((p) => {
              const nama     = p.namaItem ?? p.nama ?? p.name ?? "-";
              const ket      = p.keterangan ?? "-";
              const kategori = p.namaKategori || p.kategori || p.category || "-";
              const s        = Number(p.stok ?? p.stock ?? 0);

              return `
                <li class="flex items-center justify-between bg-white rounded-md border px-3 py-2">
                  <div class="mr-3">
                    <p class="font-medium">${nama}</p>
                    <p class="text-xs text-gray-500">
                      Kategori: ${kategori}
                    </p>
                    <p class="text-xs text-gray-500">
                      ${ket}
                    </p>
                  </div>
                  <span class="font-semibold text-red-600 whitespace-nowrap">
                    ${s} pcs
                  </span>
                </li>
              `;
            })
            .join("");
          lowStockListEl.innerHTML = rows;
        }
      }
            
      // --- Grafik Weekly (Human Friendly + 3 garis: Total, IN, OUT) ---
      if (chartWeeklyEl && typeof Chart !== "undefined") {

        // Parse format tanggal DD/MM/YYYY → Date JS
        function parseDMY(str) {
          if (!str || typeof str !== "string") return new Date(str);

          const parts = str.split("/");
          if (parts.length !== 3) return new Date(str);

          const [day, month, year] = parts.map(Number);
          return new Date(year, month - 1, day); // month index dimulai dari 0
        }

        // Ambil range minggu (Senin — Minggu)
        function getWeekRange(date) {
          const d = new Date(date);
          const day = d.getDay() || 7; // Minggu = 7

          const start = new Date(d);
          start.setDate(d.getDate() - (day - 1)); // mundur ke Senin

          const end = new Date(start);
          end.setDate(start.getDate() + 6); // sampai Minggu

          const format = (dt) =>
            dt.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

          return `${format(start)} — ${format(end)}`;
        }

        // weeklyObj: { labelMinggu: { total, in, out } }
        const weeklyObj = {};

        txRows.forEach((t) => {
          const rawDate = t.tanggal || t.date;
          const d = parseDMY(rawDate);

          if (isNaN(d)) return;

          const key = getWeekRange(d);
          const type = String(t.tipe || t.type || "").toUpperCase();

          if (!weeklyObj[key]) {
            weeklyObj[key] = { total: 0, in: 0, out: 0 };
          }

          // Hitung per transaksi (bukan qty)
          weeklyObj[key].total += 1;
          if (type === "IN") weeklyObj[key].in += 1;
          if (type === "OUT") weeklyObj[key].out += 1;
        });

        // Sorting minggu berdasarkan tanggal awal minggu
        const sortedLabels = Object.keys(weeklyObj).sort((a, b) => {
          const aDate = new Date(parseDMY(a.split(" — ")[0]));
          const bDate = new Date(parseDMY(b.split(" — ")[0]));
          return aDate - bDate;
        });

        if (sortedLabels.length > 0) {
          new Chart(chartWeeklyEl.getContext("2d"), {
            type: "line",
            data: {
              labels: sortedLabels,
              datasets: [
                {
                  label: "Total Transaksi",
                  data: sortedLabels.map((lb) => weeklyObj[lb].total),
                  borderColor: "#ec4899",
                  backgroundColor: "#ec489940",
                  borderWidth: 2,
                  tension: 0.3,
                },
                {
                  label: "Transaksi IN",
                  data: sortedLabels.map((lb) => weeklyObj[lb].in),
                  borderColor: "#22c55e",
                  backgroundColor: "#22c55e40",
                  borderWidth: 2,
                  tension: 0.3,
                },
                {
                  label: "Transaksi OUT",
                  data: sortedLabels.map((lb) => weeklyObj[lb].out),
                  borderColor: "#ef4444",
                  backgroundColor: "#ef444440",
                  borderWidth: 2,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "top" },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0 },
                },
              },
            },
          });
        }
      }
      // --- Grafik Barang Paling Banyak IN / OUT (dipisah) ---
      if (chartPopularEl && typeof Chart !== "undefined") {
        const popularity = {};
        txRows.forEach((t) => {
          const name =
            t.namaItem || t.itemName || t.item || "-";
          if (!name) return;

          const type = String(t.tipe || t.type || "").toUpperCase();
          const qty = Math.abs(
            Number(t.qty ?? t.jumlah ?? t.quantity ?? 0)
          );
          if (!qty) return;

          if (!popularity[name]) {
            popularity[name] = { in: 0, out: 0 };
          }

          if (type === "IN") {
            popularity[name].in += qty;
          } else if (type === "OUT") {
            popularity[name].out += qty;
          }
        });

        const entries = Object.entries(popularity)
          .sort(
            (a, b) =>
              (b[1].in + b[1].out) - (a[1].in + a[1].out)
          )
          .slice(0, 10); // top 10 saja biar rapi

        const labels = entries.map(([name]) => name);
        const dataIn  = entries.map(([, v]) => v.in);
        const dataOut = entries.map(([, v]) => v.out);

        if (labels.length > 0) {
          new Chart(chartPopularEl.getContext("2d"), {
            type: "bar",
            data: {
              labels,
              datasets: [
                {
                  label: "Total IN",
                  data: dataIn,
                  backgroundColor: "#22c55e", // hijau
                },
                {
                  label: "Total OUT",
                  data: dataOut,
                  backgroundColor: "#ef4444", // merah
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "top" },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `${ctx.dataset.label}: ${ctx.parsed.y}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0 },
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 25,
                  },
                },
              },
            },
          });
        }
      }
    } catch (e) {
      console.error("Gagal memuat statistik tambahan:", e);
    }
  }

  // jalankan statistik tambahan
  loadExtraStats();

  // ------- Print handler -------
window.handlePrint = async function () {
  // Pastikan data supplier sudah ada
  if (cachedSuppliers === null) {
    try {
      const resp = await getJSON(`${API}/suppliers`);
      cachedSuppliers = resp?.suppliers || resp || [];
    } catch (e) {
      cachedSuppliers = [];
      console.warn("Gagal memuat supplier untuk print:", e);
    }
  }

  fillPrintSummary(dashCache, extraStatsCache);
  buildPrintTable(cachedItems);
  window.print();
};

});

// ====== Title/Auth/Active Link ======
(function() {
  const API = "http://localhost:3000";
  const userTitle = JSON.parse(localStorage.getItem('user') || '{}');
  if (userTitle.username) document.title = userTitle.username + ' Dashboard';

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (sidebarUsername && user.username) sidebarUsername.textContent = user.username;

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    window.location.href = '../src/login.html';
  });

  // ====== Profile Modal Logic ======
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileClose');
  const profileLogout = document.getElementById('profileLogout');
  const profileSave = document.getElementById('profileSave');
  const profileCancel = document.getElementById('profileCancel');
  const profileError = document.getElementById('profileError');
  const profileFotoInput = document.getElementById('profileFotoInput');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileAvatarContainer = document.getElementById('profileAvatarContainer');
  const profilePlaceholder = document.getElementById('profileAvatarPlaceholder');

  function openProfile() {
    if (profileError) {
      profileError.classList.add('hidden');
      profileError.textContent = '';
    }
    if (profileFotoInput) profileFotoInput.value = ''; // Reset input file

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
      pImg.src = avatarUrl;
      pImg.classList.remove('hidden');
      pPlaceholder.classList.add('hidden');
      // Update sidebar button
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    } else {
      pImg.classList.add('hidden');
      pPlaceholder.classList.remove('hidden');
      // Update sidebar button
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = '👤';
    }

    profileModal.classList.remove('hidden');
    profileModal.classList.add('flex');
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  function closeProfile() {
    profileModal.classList.add('hidden');
    profileModal.classList.remove('flex');
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
  }

  profileBtn?.addEventListener('click', (e) => { e.preventDefault(); openProfile(); });
  profileClose?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileCancel?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });

  profileLogout?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('user'); window.location.href = '../src/login.html'; });

  profileSave?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (profileError) profileError.classList.add('hidden');
    
    // Mengambil data user dari localStorage (sumber paling tepercaya untuk ID)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const id = currentUser.id; // Ambil ID langsung dari objek user

    const usernameVal = document.getElementById('profileUsernameInput').value.trim();
    const emailVal = document.getElementById('profileEmailInput').value.trim();
    const passwordVal = document.getElementById('profilePasswordInput').value;
    const newFoto = document.getElementById('profileFotoInput').files[0];

    // Validasi ID (Penting!)
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

    // Gunakan FormData untuk mengirim data teks dan file
    const fd = new FormData();
    fd.append("id", id); // Sekarang menggunakan ID dari localStorage
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
        // Tidak perlu headers['Content-Type']='application/json' saat pakai FormData
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
      // update localStorage and UI
      localStorage.setItem('user', JSON.stringify(data.user));
      const sb = document.getElementById('sidebarUsername');
      if (sb) sb.textContent = data.user.username;
      
      // Perbarui tampilan avatar di sidebar setelah save berhasil
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) {
          if (data.user.avatar) {
              const avatarUrl = `${API}/uploads/${data.user.avatar}`;
              profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
              // Update juga di modal
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

  // Event listener untuk mengklik container avatar agar membuka input file
  profileAvatarContainer?.addEventListener('click', () => {
    profileFotoInput?.click();
  });

  // ====== Active Link Highlighting ======
  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage) link.classList.add("bg-pink-400","text-white","shadow");
    else link.classList.remove("bg-pink-400","text-white","shadow");
  });

  // ====== Load Profile Avatar on Page Load ======
  (function() {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn && u.avatar) {
      const avatarUrl = `${API}/uploads/${u.avatar}`;
      profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    }
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
        // Jangan reset display, biarkan CSS yang handle
      }
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (mobileMenuBtn) {
      // Pastikan tombol bisa diklik
      mobileMenuBtn.style.pointerEvents = 'auto';
      mobileMenuBtn.style.zIndex = '101';
      mobileMenuBtn.style.position = 'fixed';
      
      mobileMenuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openSidebar();
      });
      
      // Tambahkan juga mousedown untuk memastikan event terdeteksi
      mobileMenuBtn.addEventListener('mousedown', function(e) {
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

    // Close sidebar when clicking on nav links (mobile)
    document.querySelectorAll('aside nav a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          closeSidebar();
        }
      });
    });
  });
})();