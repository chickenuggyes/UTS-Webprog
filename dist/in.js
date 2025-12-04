// in.js
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000";

  const rowsContainer = document.getElementById("rows");
  const errorEl = document.getElementById("inError");
  const sidebarUsername = document.getElementById("sidebarUsername");

  // ---------- Auth + sidebar ----------
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    document.title = user.username + " Stock In";
    if (sidebarUsername) sidebarUsername.textContent = user.username;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("user");
    window.location.href = "../src/login.html";
  });

  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage)
      link.classList.add("bg-pink-400", "text-white", "shadow");
    else link.classList.remove("bg-pink-400", "text-white", "shadow");
  });

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  }

  let cachedItems = [];
  let cachedSuppliers = [];

  function rowTemplate() {
    return `
      <div class="tx-row bg-white/80 rounded-xl shadow border border-pink-100 p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div class="md:col-span-2">
          <label class="text-sm text-gray-500">Barang</label>
          <select class="input item-select" required>
            <option value="">Pilih barang…</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-500">Qty</label>
          <input type="number" min="1" class="input qty-input" placeholder="0" required>
        </div>
        <div class="md:col-span-2">
          <label class="text-sm text-gray-500">Supplier</label>
          <select class="input supplier-select">
            <option value="">Pilih supplier…</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-500">Catatan</label>
          <input type="text" class="input note-input" placeholder="opsional">
        </div>
      </div>
    `;
  }

  async function hydrateSelects(rowEl) {
    const itemSel = rowEl.querySelector(".item-select");
    const supSel = rowEl.querySelector(".supplier-select");

    if (itemSel) {
      itemSel.innerHTML =
        '<option value="">Pilih barang…</option>' +
        cachedItems
          .map(it => `<option value="${it.id}">${it.namaItem}</option>`)
          .join("");
    }

    if (supSel) {
      supSel.innerHTML =
        '<option value="">Pilih supplier…</option>' +
        cachedSuppliers
          .map(s => `<option value="${s.supid}">${s.namaSupplier}</option>`)
          .join("");
    }
  }

  async function addRow() {
    rowsContainer.insertAdjacentHTML("beforeend", rowTemplate());
    await hydrateSelects(rowsContainer.lastElementChild);
  }

  // ---------- Initial load: items & suppliers ----------
  (async function initOptions() {
    try {
      cachedItems = (await getJSON(`${API}/items`)).items || [];
      cachedSuppliers = (await getJSON(`${API}/suppliers`)).suppliers || [];
    } catch {
      cachedItems = [];
      cachedSuppliers = [];
    }

    addRow();
  })();

  document.getElementById("btnAddRow")?.addEventListener("click", addRow);

  // Note: Submit handler is in inline script in in.html
});
