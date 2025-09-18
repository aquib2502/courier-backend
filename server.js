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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

connectDb();

// Create HTTP server


const app = express();

const server = http.createServer(app); // ✅ CORRECT

// Initialize Socket.IO with the actual server instance
initializeSocket(server); // ✅ Pass the instance, not the class

app.use(cors());

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

// API Routes
app.use("/api/notifications", notificationRoutes);

const PORT =process.env.PORT
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));