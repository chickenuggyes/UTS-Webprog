window.addEventListener("DOMContentLoaded", async () => {
  // Elemen summary (/dashboard)
  const elItem  = document.getElementById("totalItem");
  const elStok  = document.getElementById("totalStok");
  const elHarga = document.getElementById("totalHarga");
  const elError = document.getElementById("dashboardError");

  // Elemen list (/items)
  const listEl = document.getElementById("listProducts");

  // Config & helpers
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
    if (!p?.foto) return FALLBACK_IMG;                // kosong → fallback
    if (/^https?:\/\//i.test(p.foto)) return p.foto;  // sudah URL penuh
    return `${API}${p.foto}`;                         // prefix /uploads/...
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

  try {
    // Ambil ringkasan + daftar item (kalau listEl ada di halaman ini)
    const [dash, itemsRes] = await Promise.all([
      getJSON(`${API}/dashboard`),
      listEl ? getJSON(`${API}/items`) : Promise.resolve(null),
    ]);

    // Isi kartu ringkasan
    if (elItem)  elItem.textContent  = dash.totalItem  ?? 0;
    if (elStok)  elStok.textContent  = dash.totalStok  ?? 0;
    if (elHarga) elHarga.textContent = rupiah(dash.totalHarga);

    // Render list produk dengan gambar
    if (listEl && itemsRes) {
      const items = itemsRes.items || [];
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
});
