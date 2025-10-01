import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "data");

function readJson(name) {
  const file = path.join(dataDir, name);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw);
}

function writeJson(name, data) {
  const file = path.join(dataDir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function nextId(list) {
  const maxId = list.reduce((m, it) => Math.max(m, Number(it.id || 0)), 0);
  return maxId + 1;
}

export function generateUserId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export const db = {
  readUsers: () => readJson("users.json"),
  writeUsers: (data) => writeJson("users.json", data),
  readItems: () => readJson("items.json"),
  writeItems: (data) => writeJson("items.json", data),
  nextId
};
