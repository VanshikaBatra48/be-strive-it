"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// latest
require("dotenv/config");
const node_http_1 = __importDefault(require("node:http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const database_1 = require("./src/config/database");
require("./src/models/user");
require("./src/models/tasks");
require("./src/models/resetPassword");
require("./src/models/refreshToken");
require("./src/models/notification");
require("./src/models/chat");
require("./src/models/taskTimeLog");
const associations_1 = require("./src/models/associations");
const tokenService_1 = require("./src/service/tokenService");
const taskSubmissionRoutes_1 = __importDefault(require("./src/routes/taskSubmissionRoutes"));
const taskBlockerRoute_1 = __importDefault(require("./src/routes/taskBlockerRoute"));
// Routes
const userRoute_1 = __importDefault(require("./src/routes/userRoute"));
const taskRoutes_1 = __importDefault(require("./src/routes/taskRoutes"));
const passwordResetRoutes_1 = __importDefault(require("./src/routes/passwordResetRoutes"));
const notificationRoutes_1 = __importDefault(require("./src/routes/notificationRoutes"));
const authMiddleware_1 = require("./src/middleware/authMiddleware");
// Realtime + jobs
const socket_1 = require("./src/socket");
const dueDateJob_1 = require("./src/jobs/dueDateJob");
const chatRoutes_1 = __importDefault(require("./src/routes/chatRoutes"));
const closeStaleTimers_1 = require("./src/jobs/closeStaleTimers");
(0, associations_1.initAssociations)();
const app = (0, express_1.default)();
const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = Array.from(new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.31.242:5173', 'http://192.168.1.32:5173', 'https://fe-strive-it.onrender.com', ...envOrigins]));
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
let isDbConnected = false;
app.use(async (_req, _res, next) => {
    if (!isDbConnected) {
        try {
            await (0, database_1.connectDB)();
            isDbConnected = true;
        }
        catch (error) {
            console.error('Database connection failed:', error);
        }
    }
    next();
});
// Register routes
// Register routes (notifications first, so '/api' mounts can't intercept it)
app.use('/api/notifications', authMiddleware_1.authenticate, notificationRoutes_1.default);
app.use('/api', userRoute_1.default);
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api', passwordResetRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api', taskSubmissionRoutes_1.default);
app.use('/api/blockers', taskBlockerRoute_1.default);
// Health / root route
app.get('/', (_req, res) => {
    res.json({ message: 'Intern Management System API is running!' });
});
// 404 handler for unmatched routes
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    const errObj = err;
    const statusCode = typeof errObj?.statusCode === 'number'
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
        message: statusCode >= 500 ? 'Internal server error' : errObj?.message || 'Request failed',
    });
});
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const TOKEN_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
async function startServer() {
    try {
        // Connect to PostgreSQL
        await (0, database_1.connectDB)();
        (0, closeStaleTimers_1.startStaleTimerJob)();
        // Clean up expired refresh tokens on startup
        void (0, tokenService_1.deleteExpiredTokens)().catch((err) => {
            console.error('Failed to clean expired refresh tokens:', err);
        });
        // Schedule cleanup every 24 hours
        const cleanupTimer = setInterval(() => {
            void (0, tokenService_1.deleteExpiredTokens)().catch((err) => {
                console.error('Failed to clean expired refresh tokens:', err);
            });
        }, TOKEN_CLEANUP_INTERVAL_MS);
        cleanupTimer.unref();
        // Create one HTTP server using Express
        const server = node_http_1.default.createServer(app);
        // Attach Socket.IO to the same HTTP server
        (0, socket_1.initSocket)(server, allowedOrigins);
        // Start the HTTP server
        server.listen(PORT, HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}`);
            console.log('Waiting for incoming requests...');
            // Start daily due-date reminders
            (0, dueDateJob_1.startDueDateJob)();
        });
        server.on('error', (error) => {
            console.error('HTTP server error:', error);
        });
        server.on('close', () => {
            clearInterval(cleanupTimer);
            console.log('HTTP server has closed.');
        });
        return server;
    }
    catch (error) {
        console.error('Unable to start server:', error);
        process.exitCode = 1;
        return undefined;
    }
}
if (!process.env.VERCEL) {
    void startServer();
}
exports.default = app;
//# sourceMappingURL=server.js.map