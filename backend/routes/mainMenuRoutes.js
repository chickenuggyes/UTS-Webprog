// backend/routes/mainMenuRoutes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { itemsController } from "../controllers/mainMenu.js";

const router = Router();

// --- Multer config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // pastikan folder ini ada: backend/uploads
    cb(null, path.join(process.cwd(), "backend", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `item-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      return cb(new Error("Hanya gambar PNG/JPG/WEBP"), false);
    }
    cb(null, true);
  }
});

// --- Routes ---
router.get("/", itemsController.list);
router.post("/", upload.single("foto"), itemsController.create);
router.put("/:id", upload.single("foto"), itemsController.update);
router.delete("/:id", itemsController.remove);

export default router;