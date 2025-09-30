import { Router } from "express";
import { report } from "../controllers/report.controller.js";
const router = Router();

// filter sederhana: ?q=...&minHarga=...&maxHarga=...
router.get("/", report);

export default router;
