import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import itemsRoutes from "./routes/mainMenuRoutes.js";
import reportRoutes from "./routes/report.js";
import { dashboard } from "./controllers/report.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/login", authRoutes);
app.use("/items", itemsRoutes);
app.use("/report", reportRoutes);
app.get("/dashboard", dashboard);

app.use(express.json({ limit: "5mb" })); // atau 10mb kalau perlu
app.use(cors());

// ... existing middleware
app.use(express.json()); // tetap dipakai untuk JSON biasa
app.use(cors());

// ▶️ bikin static untuk uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ready at http://localhost:${PORT}`));
