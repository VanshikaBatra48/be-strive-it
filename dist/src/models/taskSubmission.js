"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class TaskSubmission extends sequelize_1.Model {
}
TaskSubmission.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    taskId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    submittedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    version: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    submissionText: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    attachmentUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('submitted', 'changes_requested', 'approved'),
        defaultValue: 'submitted',
        allowNull: false
    },
    mentorFeedback: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    reviewedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true
    },
    reviewedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'task_submissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['taskId', 'version']
        }
    ]
});
exports.default = TaskSubmission;
//# sourceMappingURL=taskSubmission.js.map