import express from "express";
import { transactionController } from "../controllers/transactionsController.js";

const router = express.Router();

// CREATE TRANSACTION (IN / OUT) - format backend
router.post("/", transactionController.create);

// CREATE TRANSACTION IN - format frontend
router.post("/in", transactionController.createIn);

// CREATE TRANSACTION OUT - format frontend
router.post("/out", transactionController.createOut);

// LIST ALL TRANSACTIONS WITH DETAILS (FOR STOCK LOG & HISTORY)
router.get("/", transactionController.getAllTransactions);

// GET TODAY TRANSACTIONS COUNT
router.get("/today", transactionController.getTodayTransactions);

// DASHBOARD (pemasukan, pengeluaran, profit) - ALL TIME
router.get("/summary", transactionController.summary);

// DASHBOARD SUMMARY TODAY
router.get("/summary/today", transactionController.summaryToday);

// GRAFIK
router.get("/chart/weekly", transactionController.weekly);

export default router;
