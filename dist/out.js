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
          <input type="text" class="input note-input" placeholder="opsional">
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
    await hydrate(rowsContainer.lastElementChild);
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

  // ---------- Event: Submit ----------
  btnSubmit?.addEventListener("click", async () => {
    if (errorEl) errorEl.textContent = "";

    const payload = [];
    rowsContainer.querySelectorAll(".tx-row").forEach((row) => {
      const itemId = row.querySelector(".item-select")?.value;
      const qty = Number(row.querySelector(".qty-input")?.value || 0);
      const note = row.querySelector(".note-input")?.value || "";
      if (itemId && qty > 0) payload.push({ itemId, qty, note });
    });

    if (payload.length === 0) {
      if (errorEl) errorEl.textContent = "Minimal 1 baris valid.";
      return;
    }

    try {
      // Ambil username dari user yang login
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const username = user.username || null;
      
      if (!username) {
        console.error("⚠️ Username tidak ditemukan di localStorage. User object:", user);
        if (errorEl) errorEl.textContent = "Username tidak ditemukan. Silakan login ulang.";
        return;
      }
      
      console.log("👤 Username dari localStorage:", username);
      console.log("📦 Payload yang akan dikirim:", { rows: payload.length, username: username });
      
      const res = await fetch(`${API}/transactions/out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rows: payload,
          username: username
        }),
      });
      if (!res.ok) throw new Error(res.status + " " + res.statusText);
      alert("Transaksi OUT berhasil!");
      window.location.href = "transaction.html";
    } catch (e) {
      if (errorEl)
        errorEl.textContent = "Gagal submit: " + (e.message || "error");
    }
  });
});
