"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.connectDB = connectDB;
require("dotenv/config");
const sequelize_1 = require("sequelize");
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
exports.sequelize = new sequelize_1.Sequelize(requireEnv('DB_NAME'), requireEnv('DB_USER'), requireEnv('DB_PASSWORD'), {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
});
async function connectDB() {
    try {
        await exports.sequelize.authenticate();
        console.log('PostgreSQL connected successfully!');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Database connection failed:', message);
        throw error;
    }
}
//# sourceMappingURL=database.js.map