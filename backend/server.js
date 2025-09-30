import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import itemsRoutes from "./routes/mainMenuRoutes.js";
import reportRoutes from "./routes/report.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// mount routes
app.use("/login", authRoutes);
app.use("/items", itemsRoutes);
app.use("/report", reportRoutes);

// shortcut dashboard = ringkasan report
import { dashboard } from "./controllers/report.js";
app.get("/dashboard", dashboard);

app.get("/", (req, res) => { 
  res.redirect("/items"); 
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ready at http://localhost:${PORT}`));
