import { Router } from "express";
import { report, reportPdf } from "../controllers/report.controller.js";

const router = Router();

router.get("/", report);
router.get("/pdf", reportPdf);

export default router;
