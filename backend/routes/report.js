import { Router } from "express";
import { report, reportPdf } from "../controllers/report.js";

const router = Router();

router.get("/", report);
router.get("/pdf", reportPdf);

export default router;
