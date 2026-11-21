"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// Model class
class TaskBlockerMessage extends sequelize_1.Model {
}
// Initialize model
TaskBlockerMessage.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    conversationId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    senderId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'TaskBlockerMessage',
    tableName: 'TaskBlockerMessages',
    timestamps: true,
    updatedAt: false,
});
exports.default = TaskBlockerMessage;
//# sourceMappingURL=taskBlockerMessage.js.map