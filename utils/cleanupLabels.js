import fs from "fs";
import path from "path";

const LABELS_DIR = path.join(process.cwd(), "uploads/labels");


const MAX_AGE_DAYS = 15;

export function cleanupOldLabels() {
  const now = Date.now();
  const cutoff = MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // 15 days in ms

  fs.readdir(LABELS_DIR, (err, files) => {
    if (err) return console.error("Error reading labels dir:", err);

    files.forEach(file => {
      const filePath = path.join(LABELS_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return console.error("Error reading file stats:", err);

        const age = now - stats.mtimeMs;
        if (age > cutoff) {
          fs.unlink(filePath, err => {
            if (err) console.error("Error deleting:", filePath, err);
            else console.log(`🗑️ Deleted old label: ${file}`);
          });
        }
      });
    });
  });
}
