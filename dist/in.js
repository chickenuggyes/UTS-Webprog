// in.js
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000";

  const rowsContainer = document.getElementById("rows");
  const errorEl = document.getElementById("inError");
  const sidebarUsername = document.getElementById("sidebarUsername");

  // ---------- Auth + sidebar ----------
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.username) {
    document.title = user.username + " Stock In";
    if (sidebarUsername) sidebarUsername.textContent = user.username;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("user");
    window.location.href = "../src/login.html";
  });

  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll("aside nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if ((currentPage === 'in.html' || currentPage === 'out.html') && href === 'transaction.html') {
      link.classList.add("bg-pink-400", "text-white", "shadow");
      link.classList.remove("text-gray-800");
    } else if (href === currentPage) {
      link.classList.add("bg-pink-400", "text-white", "shadow");
      link.classList.remove("text-gray-800");
    } else {
      link.classList.remove("bg-pink-400", "text-white", "shadow");
      link.classList.add("text-gray-800");
    }
  });

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    return res.json();
  }

  let cachedItems = [];
  let itemsById = {};
  let suppliersById = {};

  function rowTemplate() {
    return `
      <div class="tx-row bg-white/80 rounded-xl shadow border border-pink-100 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="md:col-span-2">
          <label class="text-sm text-gray-500">Barang</label>
          <select class="input item-select" required>
            <option value="">Pilih barang…</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-500">Qty</label>
          <input type="number" min="1" class="input qty-input" placeholder="0" required>
        </div>
        <div>
          <label class="text-sm text-gray-500">Supplier</label>
          <div class="input bg-gray-100 cursor-not-allowed flex items-center text-sm">
            <span class="supplier-name text-gray-700">-</span>
          </div>
          <input type="hidden" class="supplier-id-input" value="">
        </div>
        <div>
          <label class="text-sm text-gray-500">Catatan</label>
          <input type="text" class="input note-input" placeholder="opsional" autocomplete="off" tabindex="0">
        </div>
      </div>
    `;
  }

  function updateSupplierForRow(rowEl, itemId) {
    const nameEl = rowEl.querySelector('.supplier-name');
    const idInput = rowEl.querySelector('.supplier-id-input');

    let supplierName = '-';
    let supplierId = '';

    if (itemId && itemsById[itemId]) {
      const prod = itemsById[itemId];
      const supid = prod.supid || prod.supplier_id || prod.supplierId;

      if (supid) {
        supplierId = supid;
        if (suppliersById[supid]) {
          supplierName = suppliersById[supid];
        } else {
          supplierName = supid;
        }
      }
    }

    if (nameEl) nameEl.textContent = supplierName;
    if (idInput) idInput.value = supplierId;
  }

  async function hydrateSelects(container) {
    const itemSel = container.querySelector('.item-select');
    if (!itemSel) return;

    itemSel.innerHTML =
      '<option value="">Pilih barang…</option>' +
      cachedItems
        .map(it => {
          const id = it.id || it.itemId || it._id;
          const name = it.namaItem || it.name || it.nama || "-";
          return `<option value="${id}">${name}</option>`;
        })
        .join('');

    itemSel.addEventListener('change', (e) => {
      const rowEl = e.target.closest('.tx-row');
      const itemId = e.target.value;
      if (rowEl) updateSupplierForRow(rowEl, itemId);
    });
  }

  async function addRow() {
    rowsContainer.insertAdjacentHTML("beforeend", rowTemplate());
    const last = rowsContainer.lastElementChild;
    await hydrateSelects(last);
    
    const noteInput = last.querySelector('.note-input');
    if (noteInput) {
      noteInput.removeAttribute('disabled');
      noteInput.removeAttribute('readonly');
      noteInput.setAttribute('tabindex', '0');
      noteInput.style.pointerEvents = 'auto';
      noteInput.style.cursor = 'text';
      noteInput.style.opacity = '1';
      noteInput.style.background = '';
      noteInput.style.width = '100%';
    }
  }

  // ---------- Initial load: items & suppliers ----------
  (async function initOptions() {
    try {
      const itemsRes = await getJSON(`${API}/items`);
      const items = itemsRes.items || itemsRes || [];
      cachedItems = items;

      itemsById = {};
      items.forEach(it => {
        const id = it.id || it.itemId || it._id;
        if (id) itemsById[id] = it;
      });
    } catch (e) {
      console.error(e);
      cachedItems = [];
    }

    try {
      const supRes = await getJSON(`${API}/suppliers`);
      const suppliers = supRes.suppliers || supRes || [];
      suppliersById = {};
      suppliers.forEach(s => {
        const id = s.supid || s.id || s.kode || s.code;
        if (!id) return;
        const name = s.namaSupplier || s.nama || s.name || id;
        suppliersById[id] = name;
      });
    } catch (e) {
      console.error(e);
      suppliersById = {};
    }

    addRow();
  })();

  document.getElementById("btnAddRow")?.addEventListener("click", addRow);

  // ---------- Submit Handler ----------
  document.getElementById("btnSubmit")?.addEventListener("click", async () => {
    if (!errorEl) return;
    errorEl.textContent = '';
    const payload = [];
    let hasIncompleteRow = false;

    rowsContainer.querySelectorAll('.tx-row').forEach((row) => {
      const itemId = row.querySelector('.item-select')?.value?.trim();
      const qtyInput = row.querySelector('.qty-input')?.value?.trim();
      const qty = Number(qtyInput) || 0;
      const supplierId = row.querySelector('.supplier-id-input')?.value?.trim() || null;
      const noteInput = row.querySelector('.note-input');
      const note = noteInput ? (noteInput.value || '').trim() : '';

      const hasItemId = itemId && itemId !== '';
      const hasQty = qty > 0;

      if (hasItemId && !hasQty) {
        hasIncompleteRow = true;
      } else if (!hasItemId && hasQty) {
        hasIncompleteRow = true;
      }

      if (hasItemId && hasQty) {
        payload.push({ itemId, qty, supplierId, note });
      }
    });

    if (hasIncompleteRow) {
      errorEl.textContent = 'Semua kolom harus diisi, catatan opsional.';
      return;
    }

    if (payload.length === 0) {
      errorEl.textContent = 'Semua kolom harus diisi, catatan opsional.';
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const user_id = user.id || null;

      if (!user_id) {
        errorEl.textContent = 'User ID tidak ditemukan. Silakan login ulang.';
        return;
      }

      // Ambil supplier_id dari row pertama (jika ada) untuk transaction header
      const supplier_id = payload.length > 0 && payload[0].supplierId ? payload[0].supplierId : null;
      
      // Hapus supplierId dari setiap row karena backend tidak menggunakannya
      const cleanPayload = payload.map(row => ({
        itemId: row.itemId,
        qty: row.qty,
        note: row.note || null
      }));

      const res = await fetch(`${API}/transactions/in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rows: cleanPayload,
          user_id: user_id,
          supplier_id: supplier_id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || res.status + ' ' + res.statusText);
      }

      alert('Transaksi IN berhasil.');
      location.href = 'transaction.html';
    } catch (e) {
      errorEl.textContent = 'Gagal submit: ' + (e.message || 'error');
      console.error('Error:', e);
    }
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

// ====== Mobile Menu Functionality ======
window.addEventListener('load', function() {
  setTimeout(function() {
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
