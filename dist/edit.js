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
    // Confirm sebelum simpan
    if (!confirm("Yakin ingin menyimpan perubahan untuk produk ini?")) return;
    
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = "Menyimpan...";
    
    try {
      const fd = new FormData(form);
      
      const res = await fetch(`${API}/items/${id}`, {
        method: "PUT",
        body: fd
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Gagal update produk (status ${res.status})`);
      }

      // Success notification
      alert("Produk berhasil diupdate!");
      window.location.href = "products.html";
    } catch (err) {
      alert(err.message || "Gagal update produk");
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });
});

// ====== Title/Auth/Active Link ======
(function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (user.username && sidebarUsername) {
    sidebarUsername.textContent = user.username;
    document.title = user.username + ' — Edit Product';
  }

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    window.location.href = '../src/login.html';
  });

  const currentPage = location.pathname.split('/').pop();
  document.querySelectorAll('aside nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) link.classList.add('bg-pink-400','text-white','shadow');
    else link.classList.remove('bg-pink-400','text-white','shadow');
  });
})();

// ====== Mobile Menu Functionality ======
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (!mobileMenuBtn || !sidebar || !mobileOverlay) {
    console.error('Mobile menu elements not found');
    return;
  }

  function openSidebar() {
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      sidebar.style.display = 'flex';
      sidebar.style.visibility = 'visible';
      sidebar.style.opacity = '1';
    }
    if (mobileOverlay) mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openSidebar();
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    });
  }

  document.querySelectorAll('aside nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        closeSidebar();
      }
    });
  });
});

// ====== Profile Modal Logic ======
document.addEventListener('DOMContentLoaded', function() {
  const API = "http://localhost:3000";
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileClose');
  const profileLogout = document.getElementById('profileLogout');
  const profileSave = document.getElementById('profileSave');
  const profileCancel = document.getElementById('profileCancel');
  const profileError = document.getElementById('profileError');
  const profileFotoInput = document.getElementById('profileFotoInput');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileAvatarContainer = document.getElementById('profileAvatarContainer');
  const profilePlaceholder = document.getElementById('profileAvatarPlaceholder');

  function openProfile() {
    if (profileError) {
      profileError.classList.add('hidden');
      profileError.textContent = '';
    }
    if (profileFotoInput) profileFotoInput.value = '';

    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const profileIdEl = document.getElementById('profileId');
    const profileUsernameInputEl = document.getElementById('profileUsernameInput');
    const profileEmailInputEl = document.getElementById('profileEmailInput');
    const profilePasswordInputEl = document.getElementById('profilePasswordInput');

    if (profileIdEl) profileIdEl.textContent = u.id || '-';
    if (profileUsernameInputEl) profileUsernameInputEl.value = u.username || '';
    if (profileEmailInputEl) profileEmailInputEl.value = u.email || '';
    if (profilePasswordInputEl) profilePasswordInputEl.value = '';

    const avatarFilename = u.avatar || null;
    const pImg = document.getElementById('profileAvatar');
    const pPlaceholder = document.getElementById('profileAvatarPlaceholder');

    if (avatarFilename) {
      const avatarUrl = `${API}/uploads/${avatarFilename}`;
      if (pImg) {
        pImg.src = avatarUrl;
        pImg.classList.remove('hidden');
      }
      if (pPlaceholder) pPlaceholder.classList.add('hidden');
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    } else {
      if (pImg) pImg.classList.add('hidden');
      if (pPlaceholder) pPlaceholder.classList.remove('hidden');
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) profileBtn.innerHTML = '👤';
    }

    if (profileModal) {
      profileModal.classList.remove('hidden');
      profileModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeProfile() {
    if (profileModal) {
      profileModal.classList.add('hidden');
      profileModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  profileBtn?.addEventListener('click', (e) => { e.preventDefault(); openProfile(); });
  profileClose?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileCancel?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
  profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });

  profileLogout?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('user'); window.location.href = '../src/login.html'; });

  profileSave?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (profileError) profileError.classList.add('hidden');
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const id = currentUser.id;

    const usernameVal = document.getElementById('profileUsernameInput').value.trim();
    const emailVal = document.getElementById('profileEmailInput').value.trim();
    const passwordVal = document.getElementById('profilePasswordInput').value;
    const newFoto = document.getElementById('profileFotoInput').files[0];

    if (!id) {
      if (profileError) {
        profileError.textContent = 'Error: User ID tidak ditemukan di penyimpanan lokal. Silakan coba login ulang.';
        profileError.classList.remove('hidden');
      }
      return;
    }

    if (!usernameVal || !emailVal) {
      if (profileError) {
        profileError.textContent = 'Username dan email wajib diisi.';
        profileError.classList.remove('hidden');
      }
      return;
    }

    const fd = new FormData();
    fd.append("id", id);
    fd.append("username", usernameVal);
    fd.append("email", emailVal);
    if (passwordVal) fd.append("password", passwordVal);
    if (newFoto) fd.append("foto", newFoto);

    const profileSaveBtn = e.target;
    const prevText = profileSaveBtn.textContent;
    profileSaveBtn.disabled = true;
    profileSaveBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`${API}/login/profile`, {
        method: 'PATCH',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        if (profileError) {
          profileError.textContent = data.message || 'Gagal memperbarui profile.';
          profileError.classList.remove('hidden');
        }
        return;
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      const sb = document.getElementById('sidebarUsername');
      if (sb) sb.textContent = data.user.username;
      
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) {
          if (data.user.avatar) {
              const avatarUrl = `${API}/uploads/${data.user.avatar}`;
              profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
              const pImg = document.getElementById('profileAvatar');
              const pPlaceholder = document.getElementById('profileAvatarPlaceholder');
              if (pImg && pPlaceholder) {
                pImg.src = avatarUrl;
                pImg.classList.remove('hidden');
                pPlaceholder.classList.add('hidden');
              }
          } else {
              profileBtn.innerHTML = '👤';
          }
      }
      
      alert('Profil berhasil diperbarui!');
      closeProfile();
    } catch (err) {
      if (profileError) {
        profileError.textContent = 'Terjadi kesalahan koneksi.';
        profileError.classList.remove('hidden');
      }
    } finally {
      profileSaveBtn.disabled = false;
      profileSaveBtn.textContent = prevText;
    }
  });

  profileAvatarContainer?.addEventListener('click', () => {
    profileFotoInput?.click();
  });

  // Load profile avatar on page load
  (function() {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn && u.avatar) {
      const avatarUrl = `${API}/uploads/${u.avatar}`;
      profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
    }
  })();
});
