import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDb from './db_config/dbConfig.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

connectDb();

const app = express();

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Api is running...');
});

app.use('/api/user', userRoutes )


const PORT =process.env.PORT
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));