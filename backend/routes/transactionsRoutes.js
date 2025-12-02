import express from "express";
import { transactionController } from "../controllers/transactionsController.js";

const router = express.Router();

// CREATE TRANSACTION (IN / OUT)
router.post("/", transactionController.create);

// LIST TRANSACTIONS
router.get("/", transactionController.getTodayTransactions);

// DASHBOARD (pemasukan, pengeluaran, profit)
router.get("/summary", transactionController.summary);

// GRAFIK
router.get("/chart/weekly", transactionController.weekly);

export default router;
