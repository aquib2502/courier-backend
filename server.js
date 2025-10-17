import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDb from './db_config/dbConfig.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js'; // Import the order routes
import manifestRoutes from './routes/manifestRoutes.js'; // Import the manifest routes
import adminRoutes from './routes/adminRoutes.js'; // Import the admin routes
import path from 'path'
import { fileURLToPath } from 'url';
import roleRoutes from './routes/roleRoutes.js'
import rateRoutes from './routes/rateRoutes.js'
import { initializeSocket } from './utils/socket.js';
import http, { Server } from 'http';
import notificationRoutes from './routes/notificationRoutes.js';
import cookieParser from 'cookie-parser';
import walletRoutes from './routes/walletRoutes.js'
import trackingRoutes from './routes/trackingRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

connectDb();

// Create HTTP server


const app = express();

const server = http.createServer(app); // ✅ CORRECT

// Initialize Socket.IO with the actual server instance
initializeSocket(server); // ✅ Pass the instance, not the class

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://thetraceexpress.com',
  'https://admin.thetraceexpress.com',
  'https://www.tracking.thetraceexpress.com',
  'https://tracking.thetraceexpress.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // allow cookies to be sent
}));

app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Api is running...');
});

app.use('/api/user', userRoutes )
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Use the order routes
app.use('/api/orders', orderRoutes);

app.use('/api/manifests', manifestRoutes); // Use the manifest routes

app.use('/api/admin', adminRoutes)

app.use('/api/roles',roleRoutes )

app.use('/api/rates',rateRoutes )

app.use('/api/wallet', walletRoutes)

app.use('/api/tracking', trackingRoutes )

// API Routes
app.use("/api/notifications", notificationRoutes);

// Example Express endpoint
app.get("/label/:trackingNo", (req, res) => {
  const trackingNo = req.params.trackingNo;

  // Lookup your label for this tracking number (in-memory object or cache)
  const labelBase64 = labelCache[trackingNo]; // e.g., { trackingNo: base64 }

  if (!labelBase64) return res.status(404).send("Label not found");

  const pdfBuffer = Buffer.from(labelBase64, "base64");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${trackingNo}.pdf"`
  );

  res.send(pdfBuffer);
});


const PORT =process.env.PORT
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));