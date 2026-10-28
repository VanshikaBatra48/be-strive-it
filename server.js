const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');
const passwordResetRoutes = require("./routes/passwordResetRoutes");

// Import models
require('./models/user');
require('./models/task');
require('./models/resetPassword');

// Import routes
const userRoutes = require('./routes/userRoute');
const taskRoutes = require('./routes/taskRoute');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.15:5173',
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((u) => u.trim()) : [])
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-side)
        if (!origin) return callback(null, true);

        // Allow explicitly listed origins or any local network origin accessing port 5173
        const isAllowed =
            allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/.test(origin);

        if (isAllowed) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ]
};

app.use(cors(corsOptions));

app.use(express.json());

// Register routes
app.use('/api', userRoutes);
app.use('/api', taskRoutes);
app.use("/api", passwordResetRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Intern Management System API is running!'
    });
});

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Step 1: Connect to PostgreSQL
        await connectDB();
        console.log('PostgreSQL connected successfully.');

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
        server.on('error', (error) => {
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
    }
}

startServer();