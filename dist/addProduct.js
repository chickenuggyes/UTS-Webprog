// Jangan deklarasi const API lagi di sini,
// API sudah didefinisikan di add.html

document.addEventListener("DOMContentLoaded", () => {
  const form          = document.getElementById("addProductForm");
  const supplierSelect = document.getElementById("supplier");

  // --- Load daftar supplier dari backend (supaya supplier baru ikut muncul) ---
  async function loadSuppliers() {
    if (!supplierSelect) return;

    // sementara tampilkan status memuat
    supplierSelect.innerHTML = `<option value="">Memuat daftar supplier...</option>`;

    try {
      const res = await fetch(`${API}/suppliers`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Gagal mengambil data supplier");

      const data = await res.json();
      const suppliers = data.suppliers || data || [];

      // isi ulang options
      supplierSelect.innerHTML = `<option value="">Pilih supplier</option>`;
      suppliers.forEach((sup) => {
        const opt = document.createElement("option");
        opt.value = sup.supid; // pakai supid dari database
        opt.textContent =
          sup.namaSupplier || sup.nama_supplier || sup.supid;
        supplierSelect.appendChild(opt);
      });

      // kalau tidak ada supplier sama sekali
      if (suppliers.length === 0) {
        supplierSelect.innerHTML =
          `<option value="">Belum ada supplier, tambahkan dulu di Dashboard</option>`;
      }
    } catch (err) {
      console.error("Error loading suppliers:", err);
      supplierSelect.innerHTML =
        `<option value="">Gagal memuat supplier</option>`;
    }
  }

  // panggil saat halaman Add Product dibuka
  loadSuppliers();

  // --- Handler submit form (tetap seperti sebelumnya) ---
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
