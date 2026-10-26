// const express = require('express');
// const { sequelize, connectDB } = require('./config/database');

// // Import model
// const Intern = require('./models/intern');
// const Mentor = require('./models/mentor');

// // Import routes
// const internRoutes = require('./routes/internRoute');
// const mentorRoutes = require('./routes/mentorRoutes');
// const userRoutes = require('./routes/userRoute');

// const app = express();

// app.use(express.json());

// // Register routes
// app.use('/', internRoutes);
// app.use('/', mentorRoutes);
// app.use('/api', userRoutes);


// // Authentication routes
// app.use('/api/auth', require('./routes/authRoutes'));


// // Test route
// app.get('/', (req, res) => {
//     res.json({
//         message: 'Intern Management System API is running!'
//     });
// });

// const PORT = process.env.PORT || 3000;

// async function startServer() {
//     try {
//         // Step 1: Connect to PostgreSQL
//         await connectDB();

//         // Step 2: Create tables for imported models if they don't exist
//         await sequelize.sync();

//         console.log('Database tables are ready!');

//         // Step 3: Start the server
//         app.listen(PORT, () => {
//             console.log(`Server running at http://localhost:${PORT}`);
//         });

//     } catch (error) {
//         console.error('Unable to start server:', error);
//         process.exit(1);
//     }
// }

// startServer();

const express = require('express');
const { sequelize, connectDB } = require('./config/database');

// Import the existing user model
const User = require('./models/user');

// Import routes
const userRoutes = require('./routes/userRoute');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());

// Register user and authentication routes
app.use('/api', userRoutes);
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Intern Management System API is running!'
    });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to PostgreSQL
        await connectDB();

        // Create tables for registered models if they do not exist
        await sequelize.sync();

        console.log('Database tables are ready!');

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();