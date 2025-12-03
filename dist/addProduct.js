// Jangan deklarasi const API lagi di sini,
// API sudah didefinisikan di add.html

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProductForm");
  if (!form) return; // jaga-jaga kalau file ini kebaca di halaman lain

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const namaItem    = document.getElementById("namaBarang").value.trim();
    const keterangan  = document.getElementById("keterangan").value.trim();
    const hargaSatuan = document.getElementById("hargaSatuan").value.trim();
    const stok        = document.getElementById("stok").value.trim();
    const kategoriEl  = document.getElementById("kategori");
    const supplierEl  = document.getElementById("supplier");
    const fotoInput   = document.getElementById("fotoInput");

    const kategori = kategoriEl?.value.trim() || "";
    const supplier = supplierEl?.value.trim() || "";
    const foto     = fotoInput && fotoInput.files[0] ? fotoInput.files[0] : null;

    const fd = new FormData();
    fd.append("namaItem", namaItem);
    fd.append("keterangan", keterangan);
    fd.append("hargaSatuan", hargaSatuan);
    fd.append("stok", stok);
    fd.append("catid", kategori);
    fd.append("supid", supplier);
    if (foto) fd.append("foto", foto);

    const btn = form.querySelector('button[type="submit"]') || form.querySelector("button");
    let prevText = "";
    if (btn) {
      btn.disabled = true;
      prevText = btn.textContent;
      btn.textContent = "Uploading...";
    }

    try {
      // API diambil dari global yang sudah didefinisikan di add.html
      const res = await fetch(`${API}/items`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        let errMsg = `Gagal menambah produk (status ${res.status})`;
        try {
          const err = await res.json();
          if (err && err.message) errMsg = err.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      alert("Produk berhasil ditambahkan!");
      window.location.href = "products.html";
    } catch (err) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText || "ADD";
      }
    }
  });
});
