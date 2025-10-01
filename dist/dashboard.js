window.addEventListener('DOMContentLoaded', async () => {
  const elItem = document.getElementById('totalItem');
  const elStok = document.getElementById('totalStok');
  const elHarga = document.getElementById('totalHarga');
  const elError = document.getElementById('dashboardError');

  const rupiah = n => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  try {
    const res = await fetch("http://localhost:3000/dashboard");
    if (!res.ok) throw new Error('Gagal ambil data dashboard');
    const data = await res.json();

    elItem.textContent = data.totalItem;
    elStok.textContent = data.totalStok;
    elHarga.textContent = rupiah(data.totalHarga);
  } catch (err) {
    elError.textContent = err.message;
    elItem.textContent = "-";
    elStok.textContent = "-";
    elHarga.textContent = "-";
  }
});
