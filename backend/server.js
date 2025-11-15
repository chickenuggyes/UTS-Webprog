import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import path from "path";
import open from "open";
import { fileURLToPath } from "url";
import fs from "fs";

// routes & controllers
import authRoutes from "./routes/authRoutes.js";
import itemsRoutes from "./routes/mainMenuRoutes.js";
import reportRoutes from "./routes/report.js";
import supplierRoutes from "./routes/supplierRoutes.js"; // ✅ Tambahan route supplier
import categoryRoutes from "./routes/categoryRoutes.js"; // ✅ Tambahan route categories
import { dashboard } from "./controllers/report.js";
import transactionsRoutes from "./routes/transactionsRoutes.js"; // ✅ Tambah ini

dotenv.config();

// __dirname untuk ESModule
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Pastikan folder uploads ada
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

/* ---------- Global middlewares ---------- */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Static files untuk gambar yang di-upload
app.use("/uploads", express.static(uploadsDir));

// Static files untuk halaman login dan asset di src
app.use("/src", express.static(path.join(__dirname, "../src")));

// Static files untuk halaman dashboard dan asset di dist
app.use("/dist", express.static(path.join(__dirname, "../dist")));

/* ---------- Routes ---------- */
app.use("/login", authRoutes);
app.use("/items", itemsRoutes);
app.use("/report", reportRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/categories", categoryRoutes); 
app.use("/transactions", transactionsRoutes); // ✅ Tambah ini di bawah routes lain

// Ringkasan dashboard
app.get("/dashboard", dashboard);

app.get("/", (req, res) => {
  res.redirect("/src/login.html");
});

/* ---------- Error handler (paling akhir) ---------- */
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API ready at http://localhost:${PORT}`);
});
