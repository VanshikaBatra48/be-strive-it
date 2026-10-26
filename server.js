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

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://192.168.1.5:5173"
    ], credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

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

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Step 1: Connect to PostgreSQL
        await connectDB();

        // Step 2: Create tables for imported models if they don't exist
        await sequelize.sync();

        console.log('Database tables are ready!');

        // Step 3: Start the server
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();