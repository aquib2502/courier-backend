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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

connectDb();

const app = express();

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


const PORT =process.env.PORT
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));