import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import type { Server } from 'node:http';

import { connectDB } from './src/config/database';

import './src/models/user';
import './src/models/tasks';
import './src/models/resetPassword';
import { initAssociations } from './src/models/associations';

// Import routes
import userRoutes from './src/routes/userRoute';
import taskRoutes from './src/routes/taskRoutes';
import passwordResetRoutes from './src/routes/passwordResetRoutes';

initAssociations();

const app = express();

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins: string[] = Array.from(
  new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...envOrigins,
  ])
);

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

app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', passwordResetRoutes);

// Health / root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Intern Management System API is running!',
  });
});

// 404 handler for unmatched API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errObj = err as { statusCode?: number; status?: number; message?: string };
  const statusCode =
    typeof errObj?.statusCode === 'number'
      ? errObj.statusCode
      : typeof errObj?.status === 'number'
        ? errObj.status
        : errObj?.message === 'Not allowed by CORS'
          ? 403
          : 500;

  if (statusCode >= 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Internal server error'
        : errObj?.message || 'Request failed',
  });
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT: number = Number(process.env.PORT) || 3000;

async function startServer(): Promise<Server | undefined> {
  try {
    // Connect and verify PostgreSQL connection (schema is managed via migrations)
    await connectDB();

    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
      console.log('Waiting for incoming requests...');
    });

    server.on('error', (error: Error) => {
      console.error('HTTP server error:', error);
    });

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