import { dbService } from "./sqlDB.js";
import dotenv from "dotenv";
dotenv.config({ path: "../aiven.env" }); // karena file di dalam /services

console.log("ENV LOADED:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD ? "(exists)" : "(missing)"
});

(async () => {
  try {
    const users = await dbService.readUsers();
    console.log("📋 Users:", users);

    const products = await dbService.readItems();
    console.log("📦 Products:", products);
  } catch (err) {
    console.error("❌ Error testing DB:", err.message);
  }
})();
