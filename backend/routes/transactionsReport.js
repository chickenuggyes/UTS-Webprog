import { Router } from "express";
import { reportTransactionsPdf, reportStockLogPdf } from "../controllers/reportTransactions.js";

const router = Router();

router.get("/transactions/pdf", reportTransactionsPdf);
router.get("/stocklog/pdf", reportStockLogPdf);

export default router;
