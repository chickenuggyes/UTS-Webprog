const API = "http://localhost:3000";

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const namaItem    = document.getElementById("namaBarang").value.trim();
  const keterangan  = document.getElementById("keterangan").value.trim();
  const hargaSatuan = document.getElementById("hargaSatuan").value.trim();
  const stok        = document.getElementById("stok").value.trim();
  const kategori    = document.getElementById("kategori") ? document.getElementById("kategori").value : "";
  const foto        = document.getElementById("fotoInput").files[0];

  const fd = new FormData();
  fd.append("namaItem", namaItem);
  fd.append("keterangan", keterangan);
  fd.append("hargaSatuan", hargaSatuan);
  fd.append("stok", stok);
  if (kategori) fd.append("kategori", kategori);
  if (foto) fd.append("foto", file); 

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = "Uploading...";

  try {
    const res = await fetch(`${API}/items`, {
      method: "POST",
      body: fd 
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