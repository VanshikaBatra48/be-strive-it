const express = require('express');
const app = express();

const internRoutes = require('./routes/internRoute');

// Middleware to read JSON request bodies
app.use(express.json());

// Register intern routes
app.use('/api/interns', internRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});