# 📋 Dokumentasi Lengkap Endpoint Frontend ↔ Backend

## 🎯 Backend Endpoints (dari routes dan controllers)

### 1. Authentication (`/login`)
**File:** `backend/routes/authRoutes.js` → `backend/controllers/auth.js`

- **POST `/login`** → `login(req, res)`
  - Request: `{ identifier, password }`
  - Response: `{ message, user: { id, username, email, avatar } }`

- **POST `/login/register`** → `register(req, res)`
  - Request: `{ username, email, password }`
  - Response: `{ message, user: { id, username, email } }`

- **PATCH `/login/profile`** → `updateProfile(req, res)` (dengan upload foto)
  - Request: `FormData` dengan `{ id, username, email, password?, foto? }`
  - Response: `{ message, user: { id, username, email, avatar }, fotoBaru? }`

---

### 2. Items/Products (`/items`)
**File:** `backend/routes/mainMenuRoutes.js` → `backend/controllers/mainMenu.js`

- **GET `/items`** → `itemsController.list(req, res)`
  - Query: `?q=keyword` (optional)
  - Response: `{ count: number, items: array }`

- **GET `/items/:id`** → `itemsController.getOne(req, res)`
  - Response: `{ id, namaItem, keterangan, hargaSatuan, stok, foto, catid, supid, namaKategori }`

- **POST `/items`** → `itemsController.create(req, res)` (dengan upload foto)
  - Request: `FormData` dengan `{ namaItem, keterangan, hargaSatuan, stok, catid?, supid?, foto? }`
  - Response: `{ message, item }`

- **PUT `/items/:id`** → `itemsController.update(req, res)` (dengan upload foto)
  - Request: `FormData` dengan `{ namaItem, keterangan, hargaSatuan, stok?, catid?, supid?, foto? }`
  - Response: `{ message, item }`

- **DELETE `/items/:id`** → `itemsController.remove(req, res)`
  - Response: `{ message }`

---

### 3. Suppliers (`/suppliers`)
**File:** `backend/routes/supplierRoutes.js` → `backend/controllers/supplierController.js`

- **GET `/suppliers`** → `supplierController.getAll(req, res)`
  - Response: `{ suppliers: array }`
  - Format: `[{ supid, namaSupplier, kontak, alamat }]`

---

### 4. Transactions (`/transactions`)
**File:** `backend/routes/transactionsRoutes.js` → `backend/controllers/transactionsController.js`

- **POST `/transactions`** → `transactionController.create(req, res)`
  - Request: `{ user_id, supplier_id?, transaction_type, note?, items: [{ product_id, quantity, hargaSatuan }] }`
  - Response: `{ message, tranid }`

- **POST `/transactions/in`** → `transactionController.createIn(req, res)`
  - Request: `{ user_id, rows: [{ itemId, qty, supplierId?, note? }] }`
  - Response: `{ message, tranid }`

- **POST `/transactions/out`** → `transactionController.createOut(req, res)`
  - Request: `{ user_id, rows: [{ itemId, qty, note? }] }`
  - Response: `{ message, tranid }`

- **GET `/transactions`** → `transactionController.getAllTransactions(req, res)`
  - Response: `{ transactions: array }`
  - Format: Array dengan detail lengkap (join stock_log, transactions, products, users, suppliers)

- **GET `/transactions/today`** → `transactionController.getTodayTransactions(req, res)`
  - Response: `{ total: number }`

- **GET `/transactions/summary`** → `transactionController.summary(req, res)`
  - Response: `{ pemasukan: number, pengeluaran: number, profit: number }`
  - Note: pemasukan = OUT (penjualan), pengeluaran = IN (pembelian)

- **GET `/transactions/summary/today`** → `transactionController.summaryToday(req, res)`
  - Response: `{ pemasukan: number, pengeluaran: number, profit: number }`
  - Note: pemasukan = OUT (penjualan), pengeluaran = IN (pembelian)

- **GET `/transactions/chart/weekly`** → `transactionController.weekly(req, res)`
  - Response: Data untuk grafik weekly

---

### 5. Dashboard (`/dashboard`)
**File:** `backend/routes/dashboard.js` → `backend/controllers/dashboard.js`

- **GET `/dashboard`** → `dashboard(req, res)`
  - Response: 
    ```json
    {
      "totalItem": number,
      "totalStok": number,
      "totalHarga": number,
      "totalKategori": number,
      "lowStockAlert": array,
      "grafikInOut": array
    }
    ```

---

## 📁 Frontend Files & Endpoints yang Digunakan

### ✅ `src/login.js`
- **POST** `http://localhost:3000/login` → Login
- **POST** `http://localhost:3000/login/register` → Register

---

### ✅ `dist/dashboard.js`
**Endpoints yang digunakan:**
- **GET** `${API}/dashboard` → Total item, stok, harga, kategori, low stock alert, grafik in-out
- **GET** `${API}/items` → List produk
- **GET** `${API}/suppliers` → List supplier
- **GET** `${API}/transactions/today` → Jumlah transaksi hari ini
- **GET** `${API}/transactions/summary/today` → Pemasukan, pengeluaran, profit hari ini
- **GET** `${API}/transactions` → Data untuk grafik weekly dan popular items

**Data dari `/dashboard`:**
- `totalItem` → Total item
- `totalStok` → Total stok
- `totalHarga` → Total harga
- `totalKategori` → Total kategori
- `lowStockAlert` → Low stock alert
- `grafikInOut` → Grafik paling banyak in-out

---

### ✅ `dist/transaction.js`
**Endpoints yang digunakan:**
- **GET** `${API}/dashboard` → Statistik (total item, stok, harga)
- **GET** `${API}/items` → Mapping produk
- **GET** `${API}/suppliers` → Mapping supplier
- **GET** `${API}/transactions` → Semua transaksi untuk stock log & nota history

---

### ✅ `dist/history.js`
**Endpoints yang digunakan:**
- **GET** `${API}/transactions?type=in|out` → Filter transaksi (optional query)
- **PATCH** `${API}/login/profile` → Update profile

---

### ✅ `dist/products.js`
**Endpoints yang digunakan:**
- **GET** `${API}/items` → List semua produk
- **DELETE** `${API}/items/:id` → Hapus produk

---

### ✅ `dist/addProduct.js`
**Endpoints yang digunakan:**
- **POST** `${API}/items` → Tambah produk baru (FormData dengan foto)

---

### ✅ `dist/edit.js`
**Endpoints yang digunakan:**
- **GET** `${API}/items/:id` → Ambil data produk untuk edit
- **GET** `${API}/items` → Fallback jika `/items/:id` gagal
- **GET** `${API}/suppliers` → List supplier untuk dropdown
- **PUT** `${API}/items/:id` → Update produk (FormData dengan foto)

---

### ✅ `dist/in.js`
**Endpoints yang digunakan:**
- **GET** `${API}/items` → List produk untuk dropdown
- **GET** `${API}/suppliers` → List supplier untuk dropdown
- **POST** `${API}/transactions/in` → Submit transaksi IN
  - Request body: `{ rows: [{ itemId, qty, supplierId?, note? }], user_id }`

---

### ✅ `dist/out.js`
**Endpoints yang digunakan:**
- **GET** `${API}/items` → List produk untuk dropdown
- **POST** `${API}/transactions/out` → Submit transaksi OUT
  - Request body: `{ rows: [{ itemId, qty, note? }], user_id }`

---

### ✅ `dist/in.html` (inline script)
**Endpoints yang digunakan:**
- **GET** `${API}/items` → List produk
- **GET** `${API}/suppliers` → List supplier
- **POST** `${API}/transactions/in` → Submit transaksi IN
- **PATCH** `${API}/login/profile` → Update profile (di modal)

---

### ✅ `dist/out.html` (inline script)
**Endpoints yang digunakan:**
- **GET** `${API}/items` → List produk
- **GET** `${API}/suppliers` → List supplier
- **POST** `${API}/transactions/out` → Submit transaksi OUT
- **PATCH** `${API}/login/profile` → Update profile (di modal)

---

### ✅ Semua HTML files dengan profile modal
**Files:** `add.html`, `dashboard.html`, `edit.html`, `in.html`, `out.html`, `products.html`, `transaction.html`

**Endpoints yang digunakan:**
- **PATCH** `${API}/login/profile` → Update profile (FormData dengan foto)

---

## ✅ Status: SEMUA ENDPOINT SUDAH SESUAI

Semua endpoint di frontend sudah sesuai dengan yang didefinisikan di backend. Format request dan response juga sudah konsisten.

---

## 📝 Catatan Penting

1. **Dashboard Endpoint (`/dashboard`):**
   - Mengembalikan: `totalItem`, `totalStok`, `totalHarga`, `totalKategori`, `lowStockAlert`, `grafikInOut`
   - Digunakan di: `dashboard.js` dan `transaction.js`

2. **Transactions Summary:**
   - `pemasukan` = OUT (penjualan) = income
   - `pengeluaran` = IN (pembelian) = outcome
   - `profit` = pemasukan - pengeluaran

3. **File Upload:**
   - Items (POST/PUT): menggunakan `FormData` dengan field `foto`
   - Profile (PATCH): menggunakan `FormData` dengan field `foto`
   - Backend menggunakan `multer` untuk handle upload

4. **Response Format:**
   - Items: `{ count, items: [...] }`
   - Suppliers: `{ suppliers: [...] }`
   - Transactions: `{ transactions: [...] }` atau langsung array
   - Dashboard: Object langsung dengan field-field yang disebutkan

