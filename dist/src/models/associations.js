"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAssociations = initAssociations;
const user_1 = __importDefault(require("./user"));
const tasks_1 = __importDefault(require("./tasks"));
const resetPassword_1 = __importDefault(require("./resetPassword"));
const refreshToken_1 = __importDefault(require("./refreshToken"));
const notification_1 = require("./notification");
const taskSubmission_1 = __importDefault(require("./taskSubmission"));
const taskTimeLog_1 = __importDefault(require("./taskTimeLog"));
const taskBlockerConversation_1 = __importDefault(require("./taskBlockerConversation"));
const taskBlockerMessage_1 = __importDefault(require("./taskBlockerMessage"));
let initialized = false;
/** Register Sequelize model associations once across the application. */
function initAssociations() {
    if (initialized)
        return;
    // User self-referencing associations
    user_1.default.belongsTo(user_1.default, {
        as: 'mentor',
        foreignKey: 'mentor_id',
    });
    user_1.default.hasMany(user_1.default, {
        as: 'mentees',
        foreignKey: 'mentor_id',
    });
    // Task associations
    user_1.default.hasMany(tasks_1.default, { as: 'assignedTasks', foreignKey: 'mentee_id' });
    user_1.default.hasMany(tasks_1.default, { as: 'createdTasks', foreignKey: 'assigned_by' });
    user_1.default.hasMany(tasks_1.default, { as: 'evaluatedTasks', foreignKey: 'evaluated_by' });
    tasks_1.default.belongsTo(user_1.default, { as: 'mentee', foreignKey: 'mentee_id' });
    tasks_1.default.belongsTo(user_1.default, { as: 'assigner', foreignKey: 'assigned_by' });
    tasks_1.default.belongsTo(user_1.default, { as: 'evaluator', foreignKey: 'evaluated_by' });
    // Password reset associations
    user_1.default.hasMany(resetPassword_1.default, { as: 'passwordResets', foreignKey: 'userId' });
    resetPassword_1.default.belongsTo(user_1.default, { as: 'user', foreignKey: 'userId' });
    // Refresh token associations
    user_1.default.hasMany(refreshToken_1.default, { as: 'refreshTokens', foreignKey: 'userId' });
    refreshToken_1.default.belongsTo(user_1.default, { as: 'user', foreignKey: 'userId' });
    // Notification associations
    user_1.default.hasMany(notification_1.Notification, {
        as: 'notifications',
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
    });
    notification_1.Notification.belongsTo(user_1.default, { as: 'user', foreignKey: 'user_id' });
    // Task submission associations
    tasks_1.default.hasMany(taskSubmission_1.default, {
        foreignKey: 'taskId',
        as: 'submissions',
    });
    taskSubmission_1.default.belongsTo(tasks_1.default, {
        foreignKey: 'taskId',
        as: 'task',
    });
    user_1.default.hasMany(taskSubmission_1.default, {
        foreignKey: 'submittedBy',
        as: 'taskSubmissions',
    });
    taskSubmission_1.default.belongsTo(user_1.default, {
        foreignKey: 'submittedBy',
        as: 'submitter',
    });
    user_1.default.hasMany(taskSubmission_1.default, {
        foreignKey: 'reviewedBy',
        as: 'reviewedSubmissions',
    });
    taskSubmission_1.default.belongsTo(user_1.default, {
        foreignKey: 'reviewedBy',
        as: 'reviewer',
    });
    tasks_1.default.hasMany(taskTimeLog_1.default, { foreignKey: 'task_id', as: 'timeLogs' });
    taskTimeLog_1.default.belongsTo(tasks_1.default, { foreignKey: 'task_id', as: 'task' });
    user_1.default.hasMany(taskTimeLog_1.default, { foreignKey: 'user_id', as: 'timeLogs' });
    taskTimeLog_1.default.belongsTo(user_1.default, { foreignKey: 'user_id', as: 'user' });
    // =====================================
    // TASK BLOCKER CONVERSATION ASSOCIATIONS
    // =====================================
    // One Task has one blocker conversation
    tasks_1.default.hasMany(taskBlockerConversation_1.default, {
        foreignKey: 'taskId',
        as: 'blockerConversations',
        onDelete: 'CASCADE',
    });
    taskBlockerConversation_1.default.belongsTo(tasks_1.default, {
        foreignKey: 'taskId',
        as: 'task',
    });
    // =====================================
    // CONVERSATION AND MESSAGE ASSOCIATIONS
    // =====================================
    // One conversation has many messages
    taskBlockerConversation_1.default.hasMany(taskBlockerMessage_1.default, {
        foreignKey: 'conversationId',
        as: 'messages',
        onDelete: 'CASCADE',
    });
    taskBlockerMessage_1.default.belongsTo(taskBlockerConversation_1.default, {
        foreignKey: 'conversationId',
        as: 'conversation',
    });
    // =====================================
    // USER AND CONVERSATION ASSOCIATIONS
    // =====================================
    // Conversation belongs to a mentee
    user_1.default.hasMany(taskBlockerConversation_1.default, {
        foreignKey: 'menteeId',
        as: 'raisedBlockers',
    });
    taskBlockerConversation_1.default.belongsTo(user_1.default, {
        foreignKey: 'menteeId',
        as: 'mentee',
    });
    // Conversation belongs to a mentor
    user_1.default.hasMany(taskBlockerConversation_1.default, {
        foreignKey: 'mentorId',
        as: 'assignedBlockerConversations',
    });
    taskBlockerConversation_1.default.belongsTo(user_1.default, {
        foreignKey: 'mentorId',
        as: 'mentor',
    });
    // =====================================
    // USER AND MESSAGE ASSOCIATIONS
    // =====================================
    // One user can send many blocker messages
    user_1.default.hasMany(taskBlockerMessage_1.default, {
        foreignKey: 'senderId',
        as: 'sentBlockerMessages',
    });
    taskBlockerMessage_1.default.belongsTo(user_1.default, {
        foreignKey: 'senderId',
        as: 'sender',
    });
    initialized = true;
}
exports.default = initAssociations;
//# sourceMappingURL=associations.js.map