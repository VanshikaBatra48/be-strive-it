"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDueDateJob = startDueDateJob;
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const tasks_1 = __importDefault(require("../models/tasks"));
const user_1 = __importDefault(require("../models/user"));
const notificationService_1 = require("../service/notificationService");
const HOUR = 60 * 60 * 1000;
const FINISHED_STATUSES = ['submitted', 'complete', 'hold', 'blocker'];
let running = false;
// Find the mentor assigned to a mentee
async function getAssignedMentor(menteeId) {
    const mentee = await user_1.default.findByPk(menteeId);
    if (!mentee || !mentee.assigned_to) {
        return null;
    }
    // This assumes assigned_to stores the mentor's name.
    return user_1.default.findOne({
        where: {
            name: mentee.assigned_to,
            role: 'mentor',
            status: 'active',
        },
    });
}
// Send notification to both mentee and mentor
async function sendTaskDueNotification(task, kind) {
    // 1. Notify mentee
    await (0, notificationService_1.notifyTaskDueDate)(task.mentee_id, task, task.due_date, kind);
    // 2. Find assigned mentor
    const mentor = await getAssignedMentor(task.mentee_id);
    // 3. Notify mentor
    if (mentor) {
        const mentee = await user_1.default.findByPk(task.mentee_id);
        if (mentee) {
            await (0, notificationService_1.notifyMentorTaskDueDate)(mentor.id, mentee.name, task, task.due_date, kind);
        }
    }
}
async function sendDueReminders() {
    if (running)
        return;
    running = true;
    try {
        const now = new Date();
        const in1h = new Date(now.getTime() + HOUR);
        const in24h = new Date(now.getTime() + 24 * HOUR);
        // ---------------------------------------
        // 1. Tasks due within the next hour
        // ---------------------------------------
        const dueSoon = await tasks_1.default.findAll({
            where: {
                due_date: {
                    [sequelize_1.Op.gt]: now,
                    [sequelize_1.Op.lte]: in1h,
                },
                status: {
                    [sequelize_1.Op.notIn]: FINISHED_STATUSES,
                },
                due_reminder_1h_sent: false,
            },
        });
        for (const task of dueSoon) {
            await (0, notificationService_1.safeNotify)(async () => {
                await sendTaskDueNotification(task, '1h');
                // Prevent duplicate reminders
                await task.update({
                    due_reminder_1h_sent: true,
                    due_reminder_24h_sent: true,
                });
            });
        }
        // ---------------------------------------
        // 2. Tasks due between 1 and 24 hours
        // ---------------------------------------
        const dueTomorrow = await tasks_1.default.findAll({
            where: {
                due_date: {
                    [sequelize_1.Op.gt]: in1h,
                    [sequelize_1.Op.lte]: in24h,
                },
                status: {
                    [sequelize_1.Op.notIn]: FINISHED_STATUSES,
                },
                due_reminder_24h_sent: false,
            },
        });
        for (const task of dueTomorrow) {
            await (0, notificationService_1.safeNotify)(async () => {
                await sendTaskDueNotification(task, '24h');
                await task.update({
                    due_reminder_24h_sent: true,
                });
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
    // Run every 1 minutes
    node_cron_1.default.schedule('*/1 * * * *', () => {
        void sendDueReminders();
    }, {
        timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
    });
    // Run once when server starts
    void sendDueReminders();
}
//# sourceMappingURL=dueDateJob.js.map