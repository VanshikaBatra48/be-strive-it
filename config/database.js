const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('Supabase PostgreSQL connected successfully!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error;
    }
}

module.exports = { sequelize, connectDB };