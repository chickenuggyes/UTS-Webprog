// backend/routes/authRoutes.js
import { Router } from "express";
import { login, register } from "../controllers/auth.js";

const router = Router();

// Login endpoint
router.post("/", login);

// Register endpoint
router.post("/register", register);

export default router;
