import { db } from "../services/jsonDB.js";

function generateUserId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateUniqueUserId(existingUsers, maxTry = 100) {
  const used = new Set((existingUsers || []).map(u => String(u.id)));
  for (let i = 0; i < maxTry; i++) {
    const id = generateUserId();
    if (!used.has(id)) return id;
  }
  return `${Date.now()}`.slice(-4);
}

export function login(req, res) {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const users = db.readUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "Login failed" });
  return res.json({
    message: "Login successful",
    user: { id: user.id, username: user.username }
  });
}

export function register(req, res) {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  if (password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters" });
  }

  const users = db.readUsers();

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: "Username is already registered" });
  }

  const newUser = {
    id: generateUniqueUserId(users), 
    username,
    password
  };

  users.push(newUser);
  db.writeUsers(users);

  return res.status(201).json({
    message: "Registration successful",
    user: { id: newUser.id, username: newUser.username }
  });
}
