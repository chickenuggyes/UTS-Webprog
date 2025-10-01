window.addEventListener('DOMContentLoaded', async () => {
  // Elemen summary (/dashboard)
  const elItem  = document.getElementById('totalItem');
  const elStok  = document.getElementById('totalStok');
  const elHarga = document.getElementById('totalHarga');
  const elError = document.getElementById('dashboardError'); // opsional

  // Elemen list (/items)
  const listEl = document.getElementById('listProducts');

  // Konfigurasi
  const BASE = 'http://localhost:3000';
  const rupiah = (n) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(n ?? 0);

  const DEFAULT_IMG = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg';
  const itemRow = (p) => `
    <li class="bg-white rounded-lg shadow border p-3 flex items-center gap-3">
      <img src="${p.foto || DEFAULT_IMG}" alt="${p.namaItem}" class="h-10 w-10 object-cover rounded-md">
      <span class="font-medium">${p.namaItem}</span>
    </li>
  `;

  // helper fetch
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res.json();
  }

  try {
    // fetch paralel
    const [dash, itemsRes] = await Promise.all([
      getJSON(`${BASE}/dashboard`),
      listEl ? getJSON(`${BASE}/items`) : Promise.resolve(null)
    ]);

    // isi kartu
    elItem && (elItem.textContent  = dash.totalItem ?? 0);
    elStok && (elStok.textContent  = dash.totalStok ?? 0);
    elHarga && (elHarga.textContent = rupiah(dash.totalHarga));

    // isi list
    if (listEl && itemsRes) {
      const items = itemsRes.items || [];
      listEl.innerHTML = items.map(itemRow).join('');
    }

    if (elError) elError.textContent = '';
  } catch (err) {
    // summary fallback
    if (elError) elError.textContent = err.message;
    if (elItem)  elItem.textContent  = '—';
    if (elStok)  elStok.textContent  = '—';
    if (elHarga) elHarga.textContent = '—';
    if (listEl)  listEl.innerHTML    = `<li class="text-red-600">${err.message}</li>`;
  }
});
