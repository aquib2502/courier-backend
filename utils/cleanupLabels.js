import fs from "fs";
import path from "path";

const LABELS_DIR = path.join(process.cwd(), "uploads/labels");

const MAX_AGE_MONTHS = 3;

export function cleanupOldLabels() {
  const now = Date.now();

  // Approx. 3 months in milliseconds (90 days)
  const cutoff = MAX_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000;

  fs.readdir(LABELS_DIR, (err, files) => {
    if (err) return console.error("Error reading labels dir:", err);

    files.forEach(file => {
      const filePath = path.join(LABELS_DIR, file);

      fs.stat(filePath, (err, stats) => {
        if (err) return console.error("Error reading file stats:", err);

        const age = now - stats.mtimeMs;

        if (age > cutoff) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error("Error deleting:", filePath, err);
            } else {
              console.log(`🗑️ Deleted old label: ${file}`);
            }
          });
        }
      });
    });
  });
}