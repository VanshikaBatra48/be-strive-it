import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import type { Server } from 'node:http';

import { sequelize, connectDB } from './src/config/database';

// Import models (so Sequelize registers them before sync)
import './src/models/user';
//import './models/Task';
import './src/models/resetPassword';

// Import routes
import userRoutes from './src/routes/userRoute';
//import taskRoutes from './src/routes/taskRoute';
import passwordResetRoutes from './src/routes/passwordResetRoutes';

const app = express();

const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.1.15:5173',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : []),
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((u) => u.trim())
    : []),
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-side)
    if (!origin) return callback(null, true);

    // Allow explicitly listed origins or any local network origin accessing port 5173
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/.test(
        origin
      );

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));

app.use(express.json());

// Register routes
app.use('/api', userRoutes);
//app.use('/api', taskRoutes);
app.use('/api', passwordResetRoutes);

// Test route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Intern Management System API is running!',
  });
});

const HOST: string = process.env.HOST || '0.0.0.0';
const PORT: number = Number(process.env.PORT) || 3000;

async function startServer(): Promise<Server | undefined> {
  try {
    // Step 1: Connect to PostgreSQL
    await connectDB();

    // Step 2: Synchronize Sequelize models
    await sequelize.sync();
    console.log('Database tables are ready!');

    // Step 3: Start Express and listen continuously for requests
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Network access: http://192.168.1.15:${PORT}`);
      console.log('Waiting for incoming requests...');
    });

    // Handle server startup and listening errors
    server.on('error', (error: Error) => {
      console.error('HTTP server error:', error);
    });

    // Log when the server closes unexpectedly
    server.on('close', () => {
      console.log('HTTP server has closed.');
    });

    return server;
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exitCode = 1;
    return undefined;
  }
}

void startServer();