window.addEventListener("DOMContentLoaded", async () => {
  const elItem  = document.getElementById("totalItem");
  const elStok  = document.getElementById("totalStok");
  const elHarga = document.getElementById("totalHarga");
  const elError = document.getElementById("dashboardError");

  const listProductsEl  = document.getElementById("listProducts");
  const listSuppliersEl = document.getElementById("listSuppliers");

  const tabProducts  = document.getElementById("tabProducts");
  const tabSuppliers = document.getElementById("tabSuppliers");

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

  function supplierRow(s) {
    const name = s?.namaSupplier || s?.nama || s?.name || "-";
    return `
      <li class="bg-white rounded-lg shadow border p-3 flex items-center gap-3">
        <span class="text-2xl">🏷️</span>
        <span class="font-medium">${name}</span>
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

  // ------- Initial load: dashboard + products (tetap) -------
  try {
    const [dash, itemsRes] = await Promise.all([
      getJSON(`${API}/dashboard`),
      listProductsEl ? getJSON(`${API}/items`) : Promise.resolve(null),
    ]);

    dashCache = {
      totalItem : dash.totalItem  ?? 0,
      totalStok : dash.totalStok  ?? 0,
      totalHarga: dash.totalHarga ?? 0
    };

    if (elItem)  elItem.textContent  = dashCache.totalItem;
    if (elStok)  elStok.textContent  = dashCache.totalStok;
    if (elHarga) elHarga.textContent = rupiah(dashCache.totalHarga);

    if (listProductsEl && itemsRes) {
      const items = itemsRes.items || [];
      cachedItems = items;
      listProductsEl.innerHTML = items.map(itemRow).join("");
    }

    if (elError) elError.textContent = "";
  } catch (err) {
    if (elError) elError.textContent = err.message || "Gagal memuat dashboard";
    if (elItem)  elItem.textContent  = "—";
    if (elStok)  elStok.textContent  = "—";
    if (elHarga) elHarga.textContent = "—";
    if (listProductsEl) listProductsEl.innerHTML = `<li class="text-red-600">${err.message}</li>`;
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
  } else {
    // suppliers -> aktif
    tabSuppliers.classList.add(...activeAdd);
    tabSuppliers.classList.remove(...activeRemove);
    // products -> non-aktif
    tabProducts.classList.add(...inactiveAdd);
    tabProducts.classList.remove(...inactiveRemove);

    listSuppliersEl?.classList.remove("hidden");
    listProductsEl?.classList.add("hidden");
  }
}


  async function ensureSuppliersLoaded() {
    if (!listSuppliersEl) return;
    if (cachedSuppliers !== null) return; // sudah pernah load

    try {
      // Sesuaikan endpoint kalau berbeda (mis: /supplier, /suppliers/list, dll)
      const resp = await getJSON(`${API}/suppliers`);
      const suppliers = resp?.suppliers || resp || [];
      cachedSuppliers = suppliers;
      if (suppliers.length === 0) {
        listSuppliersEl.innerHTML = `<li class="text-gray-500">Belum ada data supplier.</li>`;
      } else {
        listSuppliersEl.innerHTML = suppliers.map(supplierRow).join("");
      }
    } catch (e) {
      cachedSuppliers = []; // tandai sudah coba
      listSuppliersEl.innerHTML = `<li class="text-gray-500">Belum ada data supplier atau endpoint belum tersedia.</li>`;
    }
  }

  tabProducts?.addEventListener("click", () => setActiveTab("products"));
  tabSuppliers?.addEventListener("click", async () => {
    await ensureSuppliersLoaded();
    setActiveTab("suppliers");
  });

  // default: products tab
  setActiveTab("products");

  // ------- Print (produk saja) -------
  function fillPrintSummary(dash) {
    const pItem   = document.getElementById('pTotalItem');
    const pStok   = document.getElementById('pTotalStok');
    const pHarga  = document.getElementById('pTotalHarga');
    if (pItem)  pItem.textContent  = dash.totalItem;
    if (pStok)  pStok.textContent  = dash.totalStok;
    if (pHarga) pHarga.textContent = rupiah(dash.totalHarga);
  }

  function buildPrintTable(items) {
    const tbody = document.querySelector("#printTable tbody");
    if (!tbody) return;
    tbody.innerHTML = items.map((p, i) => `
      <tr>
        <td class="border px-3 py-2">${i + 1}</td>
        <td class="border px-3 py-2">${p.namaItem ?? "-"}</td>
        <td class="border px-3 py-2">${p.keterangan ?? "-"}</td>
        <td class="border px-3 py-2">${rupiah(p.hargaSatuan)}</td>
        <td class="border px-3 py-2">${p.stok ?? 0}</td>
      </tr>
    `).join("");
  }

  window.handlePrint = function () {
    fillPrintSummary(dashCache);
    buildPrintTable(cachedItems);
    window.print();
  };
});
