const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error;
    }
}

module.exports = { sequelize, connectDB };