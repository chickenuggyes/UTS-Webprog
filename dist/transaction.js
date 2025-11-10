// transaction.js
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000";

  const rupiah = (n) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const txError   = document.getElementById("txError");
  const elItem    = document.getElementById("totalItem");
  const elStok    = document.getElementById("totalStok");
  const elHarga   = document.getElementById("totalHarga");
  const tbodyHist = document.getElementById("historyBody");

  const btnIn      = document.getElementById("btnIn");
  const btnOut     = document.getElementById("btnOut");
  const btnHistory = document.getElementById("btnHistory");
  const sidebarUsername = document.getElementById("sidebarUsername");

  // ---------- Auth + sidebar ----------
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    document.title = user.username + " Transactions";
    if (sidebarUsername) sidebarUsername.textContent = user.username;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("user");
    window.location.href = "../src/login.html";
  });

  // highlight menu aktif
  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage)
      link.classList.add("bg-pink-400", "text-white", "shadow");
    else link.classList.remove("bg-pink-400", "text-white", "shadow");
  });

  // ---------- Tombol In / Out / History ----------
  btnIn?.addEventListener("click", () => (window.location.href = "in.html"));
  btnOut?.addEventListener("click", () => (window.location.href = "out.html"));
  // History tetap di halaman ini, jadi ga perlu apa-apa

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  }

  // ---------- Load statistik ----------
  (async function loadStats() {
    try {
      const dash = await getJSON(`${API}/dashboard`);
      const totalItem = dash.totalItem ?? 0;
      const totalStok = dash.totalStok ?? 0;
      const totalHarga = dash.totalHarga ?? 0;

      if (elItem) elItem.textContent = totalItem;
      if (elStok) elStok.textContent = totalStok;
      if (elHarga) elHarga.textContent = rupiah(totalHarga);
    } catch (e) {
      if (txError)
        txError.textContent = e.message || "Gagal memuat statistik dashboard";
    }
  })();

  // ---------- Load history ----------
  (async function loadHistory() {
    if (!tbodyHist) return;
    try {
      // sesuaikan kalau endpoint kamu beda, mis. /history
      const resp = await getJSON(`${API}/transactions`);
      const rows = resp?.transactions || resp?.data || resp || [];

      if (!Array.isArray(rows) || rows.length === 0) {
        tbodyHist.innerHTML =
          '<tr><td colspan="6" class="py-4 text-gray-500">Belum ada riwayat transaksi.</td></tr>';
        return;
      }

      tbodyHist.innerHTML = rows
        .map(
          (t) => `
        <tr class="border-t">
          <td class="py-2 pr-4">${t.tanggal || t.date || "-"}</td>
          <td class="py-2 pr-4 ${
            (t.tipe || t.type) === "OUT" ? "text-red-600" : "text-green-600"
          }">${(t.tipe || t.type || "-").toUpperCase()}</td>
          <td class="py-2 pr-4">${t.namaItem || t.itemName || t.item || "-"}</td>
          <td class="py-2 pr-4">${t.qty ?? t.jumlah ?? "-"}</td>
          <td class="py-2 pr-4">${t.supplier || t.namaSupplier || "-"}</td>
          <td class="py-2 pr-4">${t.catatan || t.note || "-"}</td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      tbodyHist.innerHTML =
        '<tr><td colspan="6" class="py-4 text-gray-500">Belum ada data history atau endpoint belum tersedia.</td></tr>';
    }
  })();
});
