"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Task extends sequelize_1.Model {
}
Task.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    // May be an empty string when the mentor only attaches files.
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    category: {
        type: sequelize_1.DataTypes.ENUM('upskill', 'research', 'client-project', 'inhouse-project'),
        allowNull: false,
        defaultValue: 'upskill',
    },
    priority: {
        type: sequelize_1.DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
    },
    start_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    due_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    estimated_hours: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true, // optional
    },
    mentee_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    assigned_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('in-progress', 'submitted', 'needs-revision', 'complete', 'hold', 'blocker'),
        allowNull: false,
        defaultValue: 'in-progress',
    },
    attachments: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    submission_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    demo_url: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    submission_notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    submitted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    actual_seconds: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    score: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100,
        },
    },
    feedback: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    evaluated_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    evaluated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    due_reminder_24h_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    due_reminder_1h_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    createdAt: sequelize_1.DataTypes.DATE,
    updatedAt: sequelize_1.DataTypes.DATE,
    deletedAt: sequelize_1.DataTypes.DATE,
}, {
    sequelize: database_1.sequelize,
    tableName: 'tasks',
    modelName: 'Task',
    timestamps: true,
    underscored: true,
    paranoid: true,
});
exports.default = Task;
//# sourceMappingURL=tasks.js.map