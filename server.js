const express = require('express');
const cors = require('cors');
const { sequelize, connectDB } = require('./config/database');

// Import models
require('./models/user');
require('./models/task');

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

        // Step 2: Create tables for imported models if they don't exist
        await sequelize.sync();

        console.log('Database tables are ready!');

        // Step 3: Start the server
        app.listen(PORT, HOST, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Network access: http://192.168.1.15:${PORT}`);
        });

    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();