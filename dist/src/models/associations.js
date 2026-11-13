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
let initialized = false;
/** Register Sequelize model associations once across the application. */
function initAssociations() {
    if (initialized)
        return;
    user_1.default.belongsTo(user_1.default, { as: 'mentor', foreignKey: 'mentor_id' });
    user_1.default.hasMany(user_1.default, { as: 'mentees', foreignKey: 'mentor_id' });
    user_1.default.hasMany(tasks_1.default, { as: 'assignedTasks', foreignKey: 'mentee_id' });
    user_1.default.hasMany(tasks_1.default, { as: 'createdTasks', foreignKey: 'assigned_by' });
    user_1.default.hasMany(tasks_1.default, { as: 'evaluatedTasks', foreignKey: 'evaluated_by' });
    tasks_1.default.belongsTo(user_1.default, { as: 'mentee', foreignKey: 'mentee_id' });
    tasks_1.default.belongsTo(user_1.default, { as: 'assigner', foreignKey: 'assigned_by' });
    tasks_1.default.belongsTo(user_1.default, { as: 'evaluator', foreignKey: 'evaluated_by' });
    user_1.default.hasMany(resetPassword_1.default, { as: 'passwordResets', foreignKey: 'userId' });
    resetPassword_1.default.belongsTo(user_1.default, { as: 'user', foreignKey: 'userId' });
    user_1.default.hasMany(refreshToken_1.default, { as: 'refreshTokens', foreignKey: 'userId' });
    refreshToken_1.default.belongsTo(user_1.default, { as: 'user', foreignKey: 'userId' });
    user_1.default.hasMany(notification_1.Notification, { as: 'notifications', foreignKey: 'user_id', onDelete: 'CASCADE' });
    notification_1.Notification.belongsTo(user_1.default, { as: 'user', foreignKey: 'user_id' });
    initialized = true;
}
exports.default = initAssociations;
//# sourceMappingURL=associations.js.map