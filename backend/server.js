import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import itemsRoutes from "./routes/items.routes.js";
import reportRoutes from "./routes/report.routes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// mount routes
app.use("/login", authRoutes);
app.use("/items", itemsRoutes);
app.use("/report", reportRoutes);

// shortcut dashboard = ringkasan report
import { dashboard } from "./controllers/report.controller.js";
app.get("/dashboard", dashboard);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ready at http://localhost:${PORT}`));
