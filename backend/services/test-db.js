import { dbService } from "./sqlDB.js";

(async () => {
  try {
    const users = await dbService.readUsers();
    console.log("📋 Users:", users);

    const items = await dbService.readItems();
    console.log("📦 Items:", items);
  } catch (err) {
    console.error("❌ Error testing DB:", err.message);
  }
})();