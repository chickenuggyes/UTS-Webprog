// addProduct.js
const API = "http://localhost:3000";

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // ambil elemen
  const namaItem    = document.getElementById("namaBarang").value.trim();
  const quantity    = document.getElementById("quantity").value.trim();
  const keterangan  = document.getElementById("keterangan").value.trim();
  const hargaSatuan = document.getElementById("hargaSatuan").value.trim();
  const stok        = document.getElementById("stok").value.trim();
  const file        = document.getElementById("fotoInput").files[0];

  // bangun FormData (multipart/form-data)
  const fd = new FormData();
  fd.append("namaItem", namaItem);
  fd.append("quantity", quantity);
  fd.append("keterangan", keterangan);
  fd.append("hargaSatuan", hargaSatuan);
  fd.append("stok", stok);
  if (file) fd.append("foto", file); // <-- penting: nama field harus "foto"

  // UX kecil
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = "Uploading...";

  try {
    const res = await fetch(`${API}/items`, {
      method: "POST",
      body: fd // JANGAN set headers Content-Type
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Gagal menambah produk (status ${res.status})`);
    }

    alert("Produk berhasil ditambahkan!");
    window.location.href = "products.html";
  } catch (err) {
    alert(err.message || "Terjadi kesalahan koneksi.");
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
});