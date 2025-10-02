import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import itemsRoutes from "./routes/mainMenuRoutes.js";
import reportRoutes from "./routes/report.js";
import { dashboard } from "./controllers/report.js";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ready at http://localhost:${PORT}`));
