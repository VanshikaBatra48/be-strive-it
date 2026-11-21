"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// Model class
class TaskBlockerConversation extends sequelize_1.Model {
}
// Initialize model
TaskBlockerConversation.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    taskId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    menteeId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    mentorId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('open', 'resolved'),
        allowNull: false,
        defaultValue: 'open',
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'TaskBlockerConversation',
    tableName: 'TaskBlockerConversations',
    timestamps: true,
});
exports.default = TaskBlockerConversation;
//# sourceMappingURL=taskBlockerConversation.js.map