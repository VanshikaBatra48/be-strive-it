"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.startTimer = startTimer;
exports.getActiveTimer = getActiveTimer;
exports.closeLog = closeLog;
exports.stopTimer = stopTimer;
exports.closeActiveLogForTask = closeActiveLogForTask;
exports.getTaskTimeSummary = getTaskTimeSummary;
const database_1 = require("../config/database");
const tasks_1 = __importDefault(require("../models/tasks"));
const taskTimeLog_1 = __importDefault(require("../models/taskTimeLog"));
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
async function startTimer(taskId, userId) {
    return database_1.sequelize.transaction(async (t) => {
        const task = await tasks_1.default.findByPk(taskId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!task)
            throw new HttpError(404, 'Task not found');
        if (task.mentee_id !== userId)
            throw new HttpError(403, 'Not your task');
        if (['complete', 'submitted'].includes(task.status)) {
            throw new HttpError(400, `Cannot track time on a ${task.status} task`);
        }
        const active = await taskTimeLog_1.default.findOne({
            where: { user_id: userId, ended_at: null },
            transaction: t,
        });
        if (active)
            throw new HttpError(409, 'You already have a running timer');
        if (task.status === 'needs-revision') {
            await task.update({ status: 'in-progress' }, { transaction: t });
        }
        return taskTimeLog_1.default.create({ task_id: taskId, user_id: userId, started_at: new Date() }, { transaction: t });
    });
}
async function getActiveTimer(userId) {
    const log = await taskTimeLog_1.default.findOne({
        where: { user_id: userId, ended_at: null },
        include: [{ model: tasks_1.default, as: 'task', attributes: ['id', 'title'] }],
    });
    if (!log)
        return null;
    return {
        ...log.toJSON(),
        elapsed_seconds: Math.max(0, Math.round((Date.now() - log.started_at.getTime()) / 1000)),
    };
}
async function closeLog(log, t, opts = {}) {
    const endedAt = opts.endedAt ?? new Date();
    const seconds = Math.max(0, Math.round((endedAt.getTime() - log.started_at.getTime()) / 1000));
    await log.update({
        ended_at: endedAt,
        duration_seconds: seconds,
        auto_closed: opts.autoClosed ?? false,
        ...(opts.note !== undefined && { note: opts.note }),
    }, { transaction: t });
    await tasks_1.default.increment('actual_seconds', {
        by: seconds,
        where: { id: log.task_id },
        transaction: t,
    });
    return log;
}
async function stopTimer(taskId, userId, note) {
    return database_1.sequelize.transaction(async (t) => {
        const log = await taskTimeLog_1.default.findOne({
            where: { task_id: taskId, user_id: userId, ended_at: null },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!log)
            throw new HttpError(404, 'No running timer for this task');
        return closeLog(log, t, { note });
    });
}
// Call this inside your existing status-change transactions
async function closeActiveLogForTask(taskId, t) {
    if (t) {
        const active = await taskTimeLog_1.default.findOne({
            where: { task_id: taskId, ended_at: null },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (active)
            await closeLog(active, t);
    }
    else {
        await database_1.sequelize.transaction(async (tx) => {
            const active = await taskTimeLog_1.default.findOne({
                where: { task_id: taskId, ended_at: null },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });
            if (active)
                await closeLog(active, tx);
        });
    }
}
async function getTaskTimeSummary(taskId) {
    const logs = await taskTimeLog_1.default.findAll({
        where: { task_id: taskId },
        order: [['started_at', 'DESC']],
    });
    const closedSeconds = logs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
    const running = logs.find((l) => l.ended_at === null) ?? null;
    const runningSeconds = running
        ? Math.round((Date.now() - running.started_at.getTime()) / 1000)
        : 0;
    return {
        logs,
        closedSeconds,
        running,
        totalSeconds: closedSeconds + runningSeconds,
    };
}
//# sourceMappingURL=timeLogService.js.map