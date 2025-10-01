import { db } from "../services/jsonDB.js";

export function login(req, res) {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }
  const users = db.readUsers();    
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "Login gagal" });

  return res.json({ message: "Login sukses", user: { username: user.username } });
}

// Register function
export function register(req, res) {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }
  const users = db.readUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: "Username sudah terdaftar" });
  }
  const newUser = { id: db.nextId(users), username, password };
  users.push(newUser);
  db.writeUsers(users);
  return res.json({ message: "Registrasi berhasil" });
}
