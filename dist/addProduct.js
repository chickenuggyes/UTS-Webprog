const API = "http://localhost:3000";

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

// ====== Title/Auth/Photo Preview ======
(function() {
  const userTitle = JSON.parse(localStorage.getItem('user') || '{}');
  if (userTitle.username) document.title = userTitle.username + ' Add Product';

  const fotoInput = document.getElementById('fotoInput');
  const photoBox  = document.getElementById('photoBox');
  if (fotoInput && photoBox) {
    fotoInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoBox.innerHTML =
            '<img src="' + e.target.result + '" alt="Preview" class="w-full h-full object-cover rounded-2xl"/>';
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        photoBox.textContent = 'foto.';
      }
    });
  }
})();

// ====== Profile Modal Logic (Shared) ======
(function() {
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
})();

// ====== Sidebar Username + Logout + Active Link ======
(function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (sidebarUsername && user.username) sidebarUsername.textContent = user.username;

  document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('user');
    window.location.href = '../src/login.html';
  });

  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage) link.classList.add("bg-pink-400","text-white","shadow");
    else link.classList.remove("bg-pink-400","text-white","shadow");
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
