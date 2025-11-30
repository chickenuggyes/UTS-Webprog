import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1000) + ext;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("File harus berupa gambar"), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export default upload;
