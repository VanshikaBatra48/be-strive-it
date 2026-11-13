"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDueDateJob = startDueDateJob;
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const tasks_1 = __importDefault(require("../models/tasks"));
const notificationService_1 = require("../service/notificationService");
function startDueDateJob() {
    // every day at 09:00 server time
    node_cron_1.default.schedule('0 9 * * *', async () => {
        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tasks = await tasks_1.default.findAll({
                where: {
                    due_date: { [sequelize_1.Op.between]: [now, in24h] },
                    status: { [sequelize_1.Op.notIn]: ['submitted', 'complete', 'hold'] },
                    due_reminder_sent: false,
                },
            });
            for (const task of tasks) {
                await (0, notificationService_1.safeNotify)(async () => {
                    await (0, notificationService_1.notifyTaskDueDate)(task.mentee_id, task, task.due_date);
                    await task.update({ due_reminder_sent: true });
                });
            }
        }
        catch (err) {
            console.error('Due date job failed:', err);
        }
    });
}
//# sourceMappingURL=dueDateJob.js.map