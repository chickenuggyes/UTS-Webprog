import { Router } from "express";
import { dashboard } from "../controllers/dashboard.js";

const router = Router();
   
router.get("/dashboard", dashboard);

export default router;
