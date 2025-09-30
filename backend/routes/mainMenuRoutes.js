import { Router } from "express";
import { itemsController } from "../controllers/mainMenu.js";
import { requireFields, validateItem } from "../middleware/validate.js";

const router = Router();

// list + search (?q=...)
router.get("/", itemsController.list);

// create
router.post("/", 
  requireFields(["namaItem","quantity","keterangan","hargaSatuan","stok"]),
  validateItem,
  itemsController.create
);

// update
router.put("/:id", itemsController.update);

// delete
router.delete("/:id", itemsController.remove);

export default router;
