const API = 'http://localhost:3000';

const historyBody = document.getElementById('historyBody');
// Filter buttons (History only uses All/In/Out)
const filterAll = document.getElementById('filterAll');
const filterIn = document.getElementById('filterIn');
const filterOut = document.getElementById('filterOut');
const refreshBtn = document.getElementById('refreshBtn');

let CURRENT_TYPE_FILTER = '';
let TRANSACTIONS = [];

async function loadTransactions() {
  try {
  const qs = CURRENT_TYPE_FILTER ? `?type=${CURRENT_TYPE_FILTER}` : '';
  const res = await fetch(`${API}/transactions${qs}`);
    if (!res.ok) throw new Error('Gagal ambil transaksi');
    const data = await res.json();
    TRANSACTIONS = data.items || [];
    renderTransactions();
  } catch (err) {
    console.error(err);
    historyBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Gagal memuat transaksi</td></tr>';
  }
}

function renderTransactions() {
  if (!Array.isArray(TRANSACTIONS) || TRANSACTIONS.length === 0) {
    historyBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Tidak ada transaksi</td></tr>';
    return;
  }

  // TRANSACTIONS are sorted ascending by date from backend; compute running total stock
  let runningTotal = 0;
  const rows = TRANSACTIONS.map(tx => {
    const amount = Number(tx.amount || 0);
    runningTotal += amount;
    return {
      date: new Date(tx.date).toLocaleDateString('id-ID'),
      kategori: tx.description || tx.kategori || '-',
      masuk: amount > 0 ? `+${amount.toLocaleString('id-ID')}` : '',
      keluar: amount < 0 ? `${Math.abs(amount).toLocaleString('id-ID')}` : '',
      totalStok: runningTotal.toLocaleString('id-ID')
    };
  });

  // newest first
  rows.reverse();

  historyBody.innerHTML = rows.map(row => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="p-4 text-gray-700">${row.date}</td>
      <td class="p-4 text-gray-700">${row.kategori}</td>
      <td class="p-4 text-right font-medium ${row.masuk ? 'text-blue-600 border-l-4 border-blue-200' : ''}">${row.masuk}</td>
      <td class="p-4 text-right font-medium ${row.keluar ? 'text-red-600 border-l-4 border-red-200' : ''}">${row.keluar}</td>
      <td class="p-4 text-right font-semibold text-gray-800">${row.totalStok}</td>
    </tr>
  `).join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

// Event listeners for type filters
filterAll?.addEventListener('click', () => {
  CURRENT_TYPE_FILTER = '';
  // reset styles
  [filterAll, filterIn, filterOut].forEach(b => {
    b.classList.remove('bg-blue-600','bg-red-600','text-white');
    b.classList.add('bg-white/50','border','border-gray-200');
    b.classList.remove('border-blue-500','border-red-500');
  });
  // highlight Semua (neutral pink)
  filterAll.classList.remove('bg-white/50');
  filterAll.classList.remove('border');
  filterAll.classList.remove('border-gray-200');
  filterAll.classList.add('bg-pink-500','text-white');
  loadTransactions();
});

filterIn?.addEventListener('click', () => {
  CURRENT_TYPE_FILTER = 'in';
  [filterAll, filterIn, filterOut].forEach(b => {
    b.classList.remove('bg-blue-600','bg-red-600','text-white');
    b.classList.add('bg-white/50','border','border-gray-200');
  });
  // active blue for Masuk
  filterIn.classList.remove('bg-white/50');
  filterIn.classList.remove('border');
  filterIn.classList.remove('border-gray-200');
  filterIn.classList.add('bg-blue-600','text-white','border-blue-500');
  loadTransactions();
});

filterOut?.addEventListener('click', () => {
  CURRENT_TYPE_FILTER = 'out';
  [filterAll, filterIn, filterOut].forEach(b => {
    b.classList.remove('bg-blue-600','bg-red-600','text-white');
    b.classList.add('bg-white/50','border','border-gray-200');
  });
  // active red for Keluar
  filterOut.classList.remove('bg-white/50');
  filterOut.classList.remove('border');
  filterOut.classList.remove('border-gray-200');
  filterOut.classList.add('bg-red-600','text-white','border-red-500');
  loadTransactions();
});
refreshBtn?.addEventListener('click', (e) => { loadTransactions(); });

// initial load
loadTransactions();
// set default active button (Semua)
if (filterAll) {
  filterAll.classList.remove('bg-white/50','border','border-gray-200');
  filterAll.classList.add('bg-pink-500','text-white');
}

// --- Sidebar username and profile modal wiring (sync with login) ---
const sidebarUsernameEl = document.getElementById('sidebarUsername');
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const profileForm = document.getElementById('profileForm');

function refreshSidebarUser() {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  if (sidebarUsernameEl && u.username) sidebarUsernameEl.textContent = u.username;
  if (u.username) document.title = `${u.username} History`;
  // profile button avatar swap if needed
  if (profileBtn) {
    if (u.avatar) profileBtn.innerHTML = `<img src="${u.avatar}" class="w-full h-full object-cover rounded-full"/>`;
    else profileBtn.innerHTML = '👤';
  }
}

function openProfileModal() {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  const nameInput = document.getElementById('editName');
  const emailInput = document.getElementById('editEmail');
  if (nameInput) nameInput.value = u.username || '';
  if (emailInput) emailInput.value = u.email || '';
  if (profileModal) { profileModal.classList.remove('hidden'); profileModal.classList.add('flex'); }
}

function closeProfile() {
  if (profileModal) { profileModal.classList.add('hidden'); profileModal.classList.remove('flex'); }
}

profileBtn?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal(); });
closeProfileModal?.addEventListener('click', (e) => { e.preventDefault(); closeProfile(); });
profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });

// submit profile edit
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  const id = u.id;
  const name = document.getElementById('editName')?.value.trim();
  const email = document.getElementById('editEmail')?.value.trim();
  if (!name || !email) { alert('Nama dan email wajib diisi'); return; }
  try {
    const res = await fetch('http://localhost:3000/login/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username: name, email })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'Gagal update profile');
    // update localStorage user
    const updated = Object.assign({}, u, { username: name, email });
    localStorage.setItem('user', JSON.stringify(updated));
    refreshSidebarUser();
    closeProfile();
    alert('Profile berhasil disimpan');
  } catch (err) {
    console.error(err);
    alert(err.message || 'Gagal menyimpan profile');
  }
});

// refresh username on load
refreshSidebarUser();
