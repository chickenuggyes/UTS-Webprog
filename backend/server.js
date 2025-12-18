import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// routes
import authRoutes from "./routes/authRoutes.js";
import itemsRoutes from "./routes/mainMenuRoutes.js";
import reportRoutes from "./routes/dashboard.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import transactionsRoutes from "./routes/transactionsRoutes.js";
import { dashboard } from "./controllers/dashboard.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ===============================
   UPLOADS (SATU PATH SAJA)
================================ */
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ===============================
   MIDDLEWARE
================================ */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://DOMAIN-FRONTEND-KAMU"
  ],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ===============================
   STATIC FILES
================================ */
app.use("/uploads", express.static(uploadsDir));
app.use("/src", express.static(path.join(__dirname, "../src")));
app.use("/dist", express.static(path.join(__dirname, "../dist")));

/* ===============================
   ROUTES
================================ */
app.use("/login", authRoutes);
app.use("/items", itemsRoutes);
app.use("/report", reportRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/reports", transactionsRoutes);

app.get("/dashboard", dashboard);

app.get("/", (req, res) => {
  res.redirect("/src/login.html");
});

/* ===============================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error"
  });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
