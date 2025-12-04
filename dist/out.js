// out.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ out.js loaded"); // buat debug

  const API = "http://localhost:3000";
  const rowsContainer = document.getElementById("rows");
  const errorEl = document.getElementById("outError");
  const sidebarUsername = document.getElementById("sidebarUsername");
  const btnAddRow = document.getElementById("btnAddRow");
  const btnSubmit = document.getElementById("btnSubmit");

  // ---------- Auth + sidebar ----------
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    document.title = user.username + " Stock Out";
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
    if (href === currentPage) {
      link.classList.add("bg-pink-400", "text-white", "shadow");
    } else {
      link.classList.remove("bg-pink-400", "text-white", "shadow");
    }
  });

  // ---------- Helper ----------
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  }

  let cachedItems = [];

  function rowTemplate() {
    return `
      <div class="tx-row bg-white/80 rounded-xl shadow border border-pink-100 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="md:col-span-3">
          <label class="text-sm text-gray-500">Barang</label>
          <select class="input item-select" required>
            <option value="">Pilih barang…</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-500">Qty</label>
          <input type="number" min="1" class="input qty-input" placeholder="0" required>
        </div>
        <div>
          <label class="text-sm text-gray-500">Catatan</label>
          <input type="text" class="input note-input" placeholder="opsional" autocomplete="off" tabindex="0">
        </div>
      </div>
    `;
  }

  async function hydrate(rowEl) {
    const itemSel = rowEl.querySelector(".item-select");
    if (!itemSel) return;

    itemSel.innerHTML =
      '<option value="">Pilih barang…</option>' +
      cachedItems
        .map((it) => {
          const id = it.id || it.itemId || it._id;
          const name = it.namaItem || it.name || it.nama || "-";
          return `<option value="${id}">${name}</option>`;
        })
        .join("");
  }

  async function addRow() {
    rowsContainer.insertAdjacentHTML("beforeend", rowTemplate());
    const rowEl = rowsContainer.lastElementChild;
    await hydrate(rowEl);
    
    // Pastikan input catatan di row baru bisa digunakan
    const noteInput = rowEl.querySelector('.note-input');
    if (noteInput) {
      noteInput.removeAttribute('disabled');
      noteInput.removeAttribute('readonly');
      noteInput.removeAttribute('tabindex');
      noteInput.style.pointerEvents = 'auto';
      noteInput.style.cursor = 'text';
      noteInput.style.opacity = '1';
      noteInput.style.background = '';
      
      // Pastikan input bisa difokuskan
      noteInput.addEventListener('focus', function() {
        this.style.outline = '2px solid #ec4899';
      });
      noteInput.addEventListener('blur', function() {
        this.style.outline = '';
      });
      
      // Test: pastikan input bisa diklik
      noteInput.addEventListener('click', function(e) {
        e.stopPropagation();
        this.focus();
      });
    }
  }

  // ---------- Initial load items ----------
  (async function initItems() {
    try {
      const itemsRes = await getJSON(`${API}/items`);
      cachedItems = itemsRes.items || itemsRes || [];
    } catch {
      cachedItems = [];
    }
    addRow();
  })();

  // ---------- Event: Add Row ----------
  btnAddRow?.addEventListener("click", addRow);

  // Note: Submit handler is in inline script in out.html
});
