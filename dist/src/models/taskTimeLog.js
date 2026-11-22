"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class TaskTimeLog extends sequelize_1.Model {
}
TaskTimeLog.init({
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    task_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    user_id: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    started_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    ended_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    duration_seconds: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    auto_closed: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    note: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    createdAt: sequelize_1.DataTypes.DATE,
    updatedAt: sequelize_1.DataTypes.DATE,
}, {
    sequelize: database_1.sequelize,
    tableName: 'task_time_logs',
    modelName: 'TaskTimeLog',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['task_id'] },
        { fields: ['user_id', 'ended_at'] },
        // Postgres only: DB-level guarantee of one running timer per user
        // { unique: true, fields: ['user_id'], where: { ended_at: null } },
    ],
});
exports.default = TaskTimeLog;
//# sourceMappingURL=taskTimeLog.js.map