window.addEventListener("DOMContentLoaded", async () => {
  const API = "http://localhost:3000";

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const form           = document.getElementById("editForm");
  const namaBarang     = document.getElementById("namaBarang");
  const keterangan     = document.getElementById("keterangan");
  const hargaSatuan    = document.getElementById("hargaSatuan");
  const kategori       = document.getElementById("kategori");
  const supplierSelect = document.getElementById("supplier");
  const stokField      = document.getElementById("stok");
  const fotoInput      = document.getElementById("fotoInput");
  const photoBox       = document.getElementById("photoBox");

  const FALLBACK_IMG = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg";

  const rupiah = n => new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(Number(n||0));

  function resolveImg(src) {
    if (!src) return FALLBACK_IMG;
    if (/^https?:\/\//i.test(src)) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
  }

  fotoInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        photoBox.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-2xl"/>`;
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  async function fetchItem(id) {
    try {
      const res = await fetch(`${API}/items/${id}`, { headers:{Accept:"application/json"} });
      if (res.ok) return await res.json();
    } catch (_) { }

    const resAll = await fetch(`${API}/items`, { headers:{Accept:"application/json"} });
    if (!resAll.ok) throw new Error("Gagal ambil data produk");
    const list = await resAll.json();
    const items = list.items || list || [];
    const found = items.find(x => String(x.id) === String(id));
    if (!found) throw new Error("Produk tidak ditemukan");
    if (!found.namaKategori && found.kategori) {
      found.namaKategori = found.kategori;
    }
    return found;
  }

  async function loadSuppliers(selectedSupid = "") {
    if (!supplierSelect) return;
    try {
      supplierSelect.innerHTML = `<option value="">Memuat daftar supplier...</option>`;
      const res = await fetch(`${API}/suppliers`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Gagal mengambil data supplier");

      const data = await res.json();
      const suppliers = data.suppliers || data || [];

      supplierSelect.innerHTML = `<option value="">Pilih supplier</option>`;
      suppliers.forEach((sup) => {
        const option = document.createElement("option");
        option.value = sup.supid;
        option.textContent = sup.namaSupplier || sup.nama_supplier || sup.supid;
        supplierSelect.appendChild(option);
      });

      if (selectedSupid) {
        supplierSelect.value = selectedSupid;
      }
    } catch (err) {
      console.error("Error loading suppliers:", err);
      supplierSelect.innerHTML = `<option value="">Gagal memuat supplier</option>`;
    }
  }

  async function loadItem() {
    try {
      if (!id) throw new Error("Parameter id tidak ditemukan");

      // Ambil data produk
      const data = await fetchItem(id);

      namaBarang.value  = data.namaItem     ?? "";
      keterangan.value  = data.keterangan   ?? "";
      hargaSatuan.value = data.hargaSatuan  ?? "";

      // Set kategori (readonly, hanya tampil)
      if (kategori) {
        kategori.value = data.namaKategori || data.kategori || "";
      }

      await loadSuppliers(data.supid);

      if (stokField) {
        stokField.value = "";
      }

      const img = resolveImg(data.foto);
      photoBox.innerHTML =
        `<img src="${img}" class="w-full h-full object-cover rounded-2xl" onerror="this.src='${FALLBACK_IMG}'" />`;
    } catch (err) {
      alert(err.message || "Gagal ambil data produk");
    }
  }

  await loadItem();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
  const fd = new FormData(form);
  fd.append("namaItem", fd.get("namaBarang"));

      const res = await fetch(`${API}/items/${id}`, { method: "PUT", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(()=> ({}));
        throw new Error(err.message || "Gagal update produk");
      }
      alert("Produk berhasil diupdate!");
      window.location.href = "products.html";
    } catch (err) {
      alert(err.message || "Gagal update produk");
    }
  });
});
