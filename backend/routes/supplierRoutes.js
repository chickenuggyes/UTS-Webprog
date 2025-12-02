import express from "express";
import { supplierController } from "../controllers/supplierController.js";

const router = express.Router();

// GET semua supplier
router.get("/", supplierController.getAll);

export default router;
