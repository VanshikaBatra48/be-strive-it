import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import type { Server } from 'node:http';

import { sequelize, connectDB } from './src/config/database';

import './src/models/user';
import './src/models/resetPassword';

// Import routes
import userRoutes from './src/routes/userRoute';

import passwordResetRoutes from './src/routes/passwordResetRoutes';

const app = express();

const allowedOrigins: string[] = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
    ],
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

const HOST = '127.0.0.1';
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
    console.log(`Server running at http://${HOST}:${PORT}`);
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