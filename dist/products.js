// products.js
// Ambil data produk dari backend dan render ke products.html

const grid = document.getElementById("grid");
const search = document.getElementById("searchInput");
let PRODUCTS = [];

const fmt = new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR"});

function card(p){
  return `
    <article class="bg-white rounded-lg shadow border overflow-hidden">
      <div class="bg-gray-50 h-48 grid place-items-center">
        <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg" alt="${p.namaItem}" class="h-20 w-20 object-contain"/>
      </div>
      <div class="p-4 relative">
        <span class="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow">${p.stok} in stock</span>
        <h3 class="text-lg font-semibold">${p.namaItem}</h3>
        <p class="text-sm text-gray-500">${p.keterangan}</p>
        <p class="text-2xl font-bold text-blue-700 mt-2">${fmt.format(p.hargaSatuan)}</p>
        <div class="pt-4 flex gap-3">
          <button onclick="editProduct(${p.id})" class="flex-1 border rounded-lg px-3 py-2 hover:bg-gray-50">Edit</button>
          <button onclick="viewProduct(${p.id})" class="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">View Details</button>
        </div>
      </div>
    </article>
  `;
}

function render(list){ grid.innerHTML = list.map(card).join(""); }
function applySearch(){
  const q = (search.value || "").toLowerCase().trim();
  const filtered = q ? PRODUCTS.filter(p =>
    [p.namaItem,p.keterangan].some(s => String(s).toLowerCase().includes(q))) : PRODUCTS;
  render(filtered);
}

function editProduct(id){ alert("Edit product ID: " + id); }
function viewProduct(id){ alert("View details for product ID: " + id); }

search.addEventListener("input", applySearch);

// Ambil data dari backend
fetch("http://localhost:3000/items")
  .then(res => res.json())
  .then(data => {
    PRODUCTS = data.items || [];
    render(PRODUCTS);
  })
  .catch(() => {
    grid.innerHTML = '<div class="col-span-full text-center text-red-500">Gagal mengambil data produk dari server.</div>';
  });
