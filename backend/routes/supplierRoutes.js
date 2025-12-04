import express from "express";
import { supplierController } from "../controllers/supplierController.js";

const router = express.Router();

// GET semua supplier
router.get("/", supplierController.getAll);

// POST tambah supplier
router.post("/", supplierController.create);

export default router;
