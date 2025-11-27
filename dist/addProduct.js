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
if (kategori) fd.append("catid", kategori);
const supplier = document.getElementById("supplier") ? document.getElementById("supplier").value : "";
if (supplier) fd.append("supid", supplier);
if (foto) fd.append("foto", foto);


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

// Variabel untuk elemen gambar profil baru
const profileFotoInput = document.getElementById('profileFotoInput');
const profileAvatar = document.getElementById('profileAvatar');
const profileAvatarContainer = document.getElementById('profileAvatarContainer');
const profilePlaceholder = document.getElementById('profileAvatarPlaceholder');

// Event listener untuk mengklik container avatar agar membuka input file
profileAvatarContainer?.addEventListener('click', () => {
  profileFotoInput?.click();
});

// Event listener untuk menampilkan preview gambar profil
profileFotoInput?.addEventListener('change', function () {
  if (this.files && this.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      profileAvatar.src = e.target.result;
      profileAvatar.classList.remove('hidden');
      profilePlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(this.files[0]);
  } else {
    // Jika file dibatalkan, kembalikan ke avatar default atau yang tersimpan
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u.avatar) {
      profileAvatar.src = u.avatar;
      profileAvatar.classList.remove('hidden');
      profilePlaceholder.classList.add('hidden');
    } else {
      profileAvatar.classList.add('hidden');
      profilePlaceholder.classList.remove('hidden');
    }
  }
});