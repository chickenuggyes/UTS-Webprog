const API = "http://localhost:3000"; // ganti saat deployy

const grid = document.getElementById("grid");
const search = document.getElementById("searchInput");
const chipsContainer = document.getElementById("categoryChips");
const SELECTED_CATEGORIES = new Set();

let PRODUCTS = [];
const fmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function resolveImg(p) {
  const fallback = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg";
  if (!p?.foto) return fallback;
  if (/^https?:\/\//i.test(p.foto)) return p.foto;
  return `${API}${p.foto}`;
}

function card(p) {
  const imgSrc = resolveImg(p);
  return `
    <article class="bg-white rounded-lg shadow border relative overflow-visible">
      <div class="bg-gray-50 h-48 grid place-items-center relative z-0">
        <img src="${imgSrc}" alt="${p.namaItem ?? "-"}"
             class="h-40 w-40 object-contain pointer-events-none"
             onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg';"/>
      </div>

      <div class="p-4 relative z-10">
        <span class="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow pointer-events-none">
          ${p.stok ?? 0} in stock
        </span>

        <h3 class="text-lg font-semibold mt-2">${p.namaItem ?? "-"}</h3>
        <p class="text-sm text-gray-500">${p.keterangan ?? "-"}</p>
        <p class="text-2xl font-bold text-blue-700 mt-2">${fmt.format(p.hargaSatuan || 0)}</p>

        <div class="pt-4 flex gap-3 mt-2">
          <button onclick="editProduct('${p.id}')"
            class="flex-1 border rounded-lg px-3 py-2 hover:bg-gray-50 transition cursor-pointer z-20 relative">
            Edit
          </button>
          <button onclick="deleteProduct('${p.id}')"
            class="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700 transition cursor-pointer z-20 relative">
            Delete
          </button>
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
  const catSet = SELECTED_CATEGORIES;

  const filtered = q
    ? PRODUCTS.filter((p) =>
        [p.namaItem, p.keterangan]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      )
    : PRODUCTS;

const filteredByCat =
  catSet && catSet.size > 0
    ? filtered.filter((p) => catSet.has(String(p.catid || "")))
    : filtered;

  render(filteredByCat);
}

function editProduct(id) {
  console.log("➡️ Redirect to edit:", id);
  window.location.href = `edit.html?id=${encodeURIComponent(id)}`;
}

async function reloadProducts() {
  try {
    const res = await fetch(`${API}/items`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Gagal mengambil data produk");
    const data = await res.json();

    PRODUCTS = data.items || [];

    console.log("📦 Produk dari server:", PRODUCTS);

    applySearch();
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="col-span-full text-center text-red-500">Gagal mengambil data produk dari server.</div>';
  }
}


async function deleteProduct(id) {
  if (!confirm("Yakin mau hapus produk ini?")) return;
  try {
    const res = await fetch(`${API}/items/${id}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Gagal hapus produk (status ${res.status})`);
    }
    alert("Produk berhasil dihapus!");
    await reloadProducts();
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

search.addEventListener("input", applySearch);

// chips click handling (toggle category)
if (chipsContainer) {
  chipsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const val = btn.getAttribute("data-value") || "";
    if (SELECTED_CATEGORIES.has(val)) {
      SELECTED_CATEGORIES.delete(val);
      btn.classList.remove("selected");
    } else {
      SELECTED_CATEGORIES.add(val);
      btn.classList.add("selected");
    }
    applySearch();
  });
}

reloadProducts();
