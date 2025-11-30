import { Router } from "express";
import { login, register, updateProfile } from "../controllers/auth.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/", login);
router.post("/register", register);

// penting!! tambah upload.single("foto")
router.patch("/profile", upload.single("foto"), updateProfile);

export default router;
