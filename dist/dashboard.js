// dashboard.js

// Fetch data dari backend /dashboard dan tampilkan ke dashboard
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/dashboard');
        if (!response.ok) throw new Error('Gagal ambil data dashboard');
        const data = await response.json();
        // Tampilkan data ke elemen dashboard
        document.getElementById('totalItem').textContent = data.totalItem;
        document.getElementById('totalStok').textContent = data.totalStok;
        document.getElementById('totalHarga').textContent = 'Rp ' + data.totalHarga.toLocaleString();
    } catch (err) {
        // Jika gagal, tampilkan pesan error
        document.getElementById('dashboardError').textContent = err.message;
    }
});
