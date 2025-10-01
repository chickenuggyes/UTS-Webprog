// addProduct.js

document.getElementById('addProductForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const namaItem = document.getElementById('namaBarang').value.trim();
  const quantity = document.getElementById('quantity').value.trim();
  const keterangan = document.getElementById('keterangan').value.trim();
  const hargaSatuan = document.getElementById('hargaSatuan').value.trim();
  const stok = document.getElementById('stok').value.trim();
  const fotoInput = document.getElementById('fotoInput');
  let foto = '';

  if (fotoInput.files && fotoInput.files[0]) {
    // Convert image to base64
    const reader = new FileReader();
    reader.onload = async function(e) {
      foto = e.target.result;
      await submitProduct(namaItem, quantity, keterangan, hargaSatuan, stok, foto);
    };
    reader.readAsDataURL(fotoInput.files[0]);
  } else {
    await submitProduct(namaItem, quantity, keterangan, hargaSatuan, stok, foto);
  }
});

async function submitProduct(namaItem, quantity, keterangan, hargaSatuan, stok, foto) {
  try {
    const response = await fetch('http://localhost:3000/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ namaItem, quantity, keterangan, hargaSatuan, stok, foto })
    });
    if (response.ok) {
      alert('Produk berhasil ditambahkan!');
      window.location.href = 'products.html';
    } else {
      const data = await response.json();
      alert(data.message || 'Gagal menambah produk!');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}
