window.addEventListener("DOMContentLoaded", async () => {
  const elItem  = document.getElementById("totalItem");
  const elStok  = document.getElementById("totalStok");
  const elHarga = document.getElementById("totalHarga");
  const elError = document.getElementById("dashboardError");

  const listEl = document.getElementById("listProducts");

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

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res.json();
  }

  let cachedItems = [];                 
  let dashCache   = {                 
    totalItem: 0, totalStok: 0, totalHarga: 0
  };

  try {
    const [dash, itemsRes] = await Promise.all([
      getJSON(`${API}/dashboard`),
      listEl ? getJSON(`${API}/items`) : Promise.resolve(null),
    ]);

    dashCache = {
      totalItem : dash.totalItem  ?? 0,
      totalStok : dash.totalStok  ?? 0,
      totalHarga: dash.totalHarga ?? 0
    };

    if (elItem)  elItem.textContent  = dashCache.totalItem;
    if (elStok)  elStok.textContent  = dashCache.totalStok;
    if (elHarga) elHarga.textContent = rupiah(dashCache.totalHarga);

    if (listEl && itemsRes) {
      const items = itemsRes.items || [];
      cachedItems = items;
      listEl.innerHTML = items.map(itemRow).join("");
    }

    if (elError) elError.textContent = "";
  } catch (err) {
    if (elError) elError.textContent = err.message || "Gagal memuat dashboard";
    if (elItem)  elItem.textContent  = "—";
    if (elStok)  elStok.textContent  = "—";
    if (elHarga) elHarga.textContent = "—";
    if (listEl)  listEl.innerHTML    = `<li class="text-red-600">${err.message}</li>`;
  }

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
