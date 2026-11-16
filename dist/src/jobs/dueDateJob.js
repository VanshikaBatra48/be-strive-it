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
const HOUR = 60 * 60 * 1000;
const FINISHED_STATUSES = ['submitted', 'complete', 'hold'];
let running = false; // stops two runs from overlapping
async function sendDueReminders() {
    if (running)
        return;
    running = true;
    try {
        const now = new Date();
        const in1h = new Date(now.getTime() + HOUR);
        const in24h = new Date(now.getTime() + 24 * HOUR);
        // 1) Tasks due within the next hour -> "1 hour" reminder
        const dueSoon = await tasks_1.default.findAll({
            where: {
                due_date: { [sequelize_1.Op.gt]: now, [sequelize_1.Op.lte]: in1h },
                status: { [sequelize_1.Op.notIn]: FINISHED_STATUSES },
                due_reminder_1h_sent: false,
            },
        });
        for (const task of dueSoon) {
            await (0, notificationService_1.safeNotify)(async () => {
                await (0, notificationService_1.notifyTaskDueDate)(task.mentee_id, task, task.due_date, '1h');
                // also close the 24h reminder, so the mentee never gets both at once
                await task.update({ due_reminder_1h_sent: true, due_reminder_24h_sent: true });
            });
        }
        // 2) Tasks due between 1 and 24 hours from now -> "24 hours" reminder
        const dueTomorrow = await tasks_1.default.findAll({
            where: {
                due_date: { [sequelize_1.Op.gt]: in1h, [sequelize_1.Op.lte]: in24h },
                status: { [sequelize_1.Op.notIn]: FINISHED_STATUSES },
                due_reminder_24h_sent: false,
            },
        });
        for (const task of dueTomorrow) {
            await (0, notificationService_1.safeNotify)(async () => {
                await (0, notificationService_1.notifyTaskDueDate)(task.mentee_id, task, task.due_date, '24h');
                await task.update({ due_reminder_24h_sent: true });
            });
        }
    }
    catch (err) {
        console.error('Due date job failed:', err);
    }
    finally {
        running = false;
    }
}
function startDueDateJob() {
    // every 5 minutes
    node_cron_1.default.schedule('*/5 * * * *', () => {
        void sendDueReminders();
    }, { timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata' });
    // also run once at startup, to catch anything missed while the server was down
    void sendDueReminders();
}
//# sourceMappingURL=dueDateJob.js.map