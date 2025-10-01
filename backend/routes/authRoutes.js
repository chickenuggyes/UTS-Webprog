import { Router } from "express";
import { login } from "../controllers/auth.js";
const router = Router();

router.post("/", login);

// Register endpoint
import { register } from "../controllers/auth.js";
router.post("/register", register);
export default router;
