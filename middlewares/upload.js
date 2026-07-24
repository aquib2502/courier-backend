import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads/blogs directory exists
const blogsUploadDir = "uploads/blogs";
if (!fs.existsSync(blogsUploadDir)) {
  fs.mkdirSync(blogsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, blogsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|gif|webp|pdf)$/i;
  const allowedMimetypes = /^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/i;

  const isExtValid = allowedExts.test(file.originalname);
  const isMimeValid = allowedMimetypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) and PDF documents are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter,
});

export default upload;