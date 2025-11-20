import { Router } from "express";
import { login, register, updateProfile } from "../controllers/auth.js";

const router = Router();

router.post("/", login);
router.patch("/profile", updateProfile);
router.post("/register", register);

export default router;
