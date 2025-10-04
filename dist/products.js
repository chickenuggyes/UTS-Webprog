const API = "http://localhost:3000"; // ganti saat deploy

const grid   = document.getElementById("grid");
const search = document.getElementById("searchInput");

let PRODUCTS = [];
const fmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function resolveImg(p) {
  // fallback default icon
  const fallback = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg";
  if (!p?.foto) return fallback;                         // kosong → default
  if (/^https?:\/\//i.test(p.foto)) return p.foto;       // URL penuh
  return `${API}${p.foto}`;                              // path relatif /uploads/...
}

function card(p) {
  const imgSrc = resolveImg(p);
  return `
    <article class="bg-white rounded-lg shadow border overflow-hidden">
      <div class="bg-gray-50 h-48 grid place-items-center">
        <img src="${imgSrc}" alt="${p.namaItem ?? "-"}"
             class="h-40 w-40 object-contain"
             onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg';"/>
      </div>
      <div class="p-4 relative">
        <span class="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">
          ${p.stok ?? 0} in stock
        </span>
        <h3 class="text-lg font-semibold">${p.namaItem ?? "-"}</h3>
        <p class="text-sm text-gray-500">${p.keterangan ?? "-"}</p>
        <p class="text-2xl font-bold text-blue-700 mt-2">${fmt.format(p.hargaSatuan || 0)}</p>
        <div class="pt-4 flex gap-3">
          <button onclick="editProduct(${JSON.stringify(p.id)})"
                  class="flex-1 border rounded-lg px-3 py-2 hover:bg-gray-50">Edit</button>
          <button onclick="deleteProduct(${JSON.stringify(p.id)})"
                  class="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function render(list) {
  grid.innerHTML = list.map(card).join("");
}

function applySearch() {
  const q = (search.value || "").toLowerCase().trim();
  const filtered = q
    ? PRODUCTS.filter(p =>
        [p.namaItem, p.keterangan]
          .filter(Boolean)
          .some(s => String(s).toLowerCase().includes(q))
      )
    : PRODUCTS;
  render(filtered);
}

function editProduct(id) {
  alert("Edit product ID: " + id);
}

async function reloadProducts() {
  const res = await fetch(`${API}/items`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Gagal mengambil data produk");
  const data = await res.json();
  PRODUCTS = data.items || [];
  applySearch();
}

async function deleteProduct(id) {
  if (!confirm("Yakin mau hapus produk ini?")) return;
  try {
    const res = await fetch(`${API}/items/${id}`, {
      method: "DELETE",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Gagal hapus produk (status ${res.status})`);
    }
    alert("Produk berhasil dihapus!");
    await reloadProducts(); // re-fetch list terbaru dari backend
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

search.addEventListener("input", applySearch);

reloadProducts().catch(() => {
  grid.innerHTML =
    '<div class="col-span-full text-center text-red-500">Gagal mengambil data produk dari server.</div>';
});
