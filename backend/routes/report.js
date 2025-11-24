import { Router } from "express";
import { 
  report, 
  reportPdf, 
  dashboard, 
  reportSupplier, 
} from "../controllers/report.js";

const router = Router();

router.get("/", report);
router.get("/pdf", reportPdf);          
router.get("/dashboard", dashboard);
router.get("/supplier", reportSupplier);

export default router;
