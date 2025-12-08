const API = "http://localhost:3000";

const grid = document.getElementById("grid");
const search = document.getElementById("searchInput");
const chipsContainer = document.getElementById("categoryChips");
const SELECTED_CATEGORIES = new Set();

let PRODUCTS = [];
const fmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function resolveImg(p) {
  const fallback = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg";
  if (!p?.foto) return fallback;
  if (/^https?:\/\//i.test(p.foto)) return p.foto;
  return `${API}${p.foto}`;
}

function card(p) {
  const imgSrc = resolveImg(p);
  return `
    <article class="product-card bg-white rounded-lg shadow border relative overflow-visible">
      <div class="bg-gray-50 h-48 grid place-items-center relative z-0">
        <img src="${imgSrc}" alt="${p.namaItem ?? "-"}"
             class="h-40 w-40 object-contain pointer-events-none"
             onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg';"/>
      </div>

      <div class="p-4 relative z-10">
        <span class="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow pointer-events-none">
          ${p.stok ?? 0} in stock
        </span>

        <h3 class="text-lg font-semibold mt-2">${p.namaItem ?? "-"}</h3>
        <p class="text-sm text-gray-500">${p.keterangan ?? "-"}</p>
        <div class="mt-2">
          <p class="text-xs text-pink-600 font-medium mb-1">${p.namaKategori || "Kategori"}</p>
          <p class="text-2xl font-bold text-blue-700">${fmt.format(p.hargaSatuan || 0)}</p>
        </div>

        <div class="pt-4 flex gap-3 mt-2">
          <button onclick="editProduct('${p.id}')"
            class="flex-1 border rounded-lg px-3 py-2 hover:bg-gray-50 transition cursor-pointer z-20 relative">
            Edit
          </button>
          <button onclick="deleteProduct('${p.id}')"
            class="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700 transition cursor-pointer z-20 relative">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

function render(list) {
  grid.innerHTML = list.map(card).join("");
}

function applySearch() {
  const q = (search.value || "").toLowerCase().trim();
  const catSet = SELECTED_CATEGORIES;

  const filtered = q
    ? PRODUCTS.filter((p) =>
        [p.namaItem, p.keterangan]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      )
    : PRODUCTS;

const filteredByCat =
  catSet && catSet.size > 0
    ? filtered.filter((p) => catSet.has(String(p.catid || "")))
    : filtered;

  render(filteredByCat);
}

function editProduct(id) {
  // Confirm sebelum masuk halaman edit
  if (!confirm("Yakin ingin mengedit produk ini?")) return;
  console.log("➡️ Redirect to edit:", id);
  window.location.href = `edit.html?id=${encodeURIComponent(id)}`;
}


async function reloadProducts() {
  try {
    const res = await fetch(`${API}/items`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Gagal mengambil data produk");
    const data = await res.json();

    PRODUCTS = data.items || [];

    console.log("📦 Produk dari server:", PRODUCTS);

    applySearch();
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<div class="col-span-full text-center text-red-500">Gagal mengambil data produk dari server.</div>';
  }
}


async function deleteProduct(id) {
  if (!confirm("Yakin mau hapus produk ini?")) return;
  try {
    const res = await fetch(`${API}/items/${id}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Gagal hapus produk (status ${res.status})`);
    }
    alert("Produk berhasil dihapus!");
    await reloadProducts();
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

search.addEventListener("input", applySearch);

// chips click handling (toggle category)
if (chipsContainer) {
  chipsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const val = btn.getAttribute("data-value") || "";
    if (SELECTED_CATEGORIES.has(val)) {
      SELECTED_CATEGORIES.delete(val);
      btn.classList.remove("selected");
    } else {
      SELECTED_CATEGORIES.add(val);
      btn.classList.add("selected");
    }
    applySearch();
  });
}

reloadProducts();

// ====== Logout Logic ======
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
  e.preventDefault();
  localStorage.removeItem('user');
  window.location.href = '../src/login.html';
});

// ====== Profile Modal Logic ======
(function() {
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileClose');
  const profileLogout = document.getElementById('profileLogout');
  const profileSave = document.getElementById('profileSave');
  const profileCancel = document.getElementById('profileCancel');
  const profileError = document.getElementById('profileError');
  const sidebarUsername = document.getElementById('sidebarUsername');
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
      document.getElementById('profileId').textContent = u.id || '-';
      document.getElementById('profileUsernameInput').value = u.username || '';
      document.getElementById('profileEmailInput').value = u.email || '';
      document.getElementById('profilePasswordInput').value = '';

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

  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => { 
      e.preventDefault(); 
      openProfile(); 
    });
  }
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
})();

// ====== Sidebar Username + Avatar ======
(function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const sidebarUsername = document.getElementById('sidebarUsername');
  if (sidebarUsername && user.username) {
    sidebarUsername.textContent = user.username;
  }
  
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn && user.avatar) {
    const avatarUrl = `${API}/uploads/${user.avatar}`;
    profileBtn.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
  }
})();

// ====== Active Link Highlight ======
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightActiveLink);
  } else {
    highlightActiveLink();
  }
  
  function highlightActiveLink() {
    const currentPage = location.pathname.split("/").pop();
    const sidebarLinks = document.querySelectorAll("aside nav a");
    sidebarLinks.forEach(link => {
      const href = link.getAttribute("href");
      if (href === currentPage) {
        link.classList.add("bg-pink-400", "text-white", "shadow");
      } else {
        link.classList.remove("bg-pink-400", "text-white", "shadow");
      }
    });
  }
})();

// ====== Mobile Menu Functionality ======
window.addEventListener('load', function() {
  setTimeout(function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (!mobileMenuBtn || !sidebar || !mobileOverlay) {
      console.error('Mobile menu elements not found', {mobileMenuBtn, sidebar, mobileOverlay});
      return;
    }

    function openSidebar() {
      if (sidebar) {
        sidebar.classList.add('mobile-open');
        sidebar.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; left: 0 !important; z-index: 100 !important; position: fixed !important; width: 16rem !important;';
      }
      if (mobileOverlay) {
        mobileOverlay.classList.add('active');
        mobileOverlay.style.cssText = 'pointer-events: auto !important; display: block !important; visibility: visible !important; z-index: 99 !important;';
      }
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      if (sidebar) {
        sidebar.classList.remove('mobile-open');
        sidebar.style.left = '-100%';
      }
      if (mobileOverlay) {
        mobileOverlay.classList.remove('active');
        mobileOverlay.style.cssText = 'pointer-events: none !important; display: none !important; visibility: hidden !important;';
      }
      document.body.style.overflow = '';
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.style.cssText = 'pointer-events: auto !important; z-index: 9999 !important; position: fixed !important; touch-action: manipulation;';
      
      const btnClone = mobileMenuBtn.cloneNode(true);
      mobileMenuBtn.parentNode.replaceChild(btnClone, mobileMenuBtn);
      const btn = document.getElementById('mobileMenuBtn');
      
      if (btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openSidebar();
        }, {capture: true});
        
        btn.addEventListener('mousedown', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openSidebar();
        }, {capture: true});
        
        btn.addEventListener('touchstart', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openSidebar();
        }, {capture: true});
      }
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
  }, 100);
});