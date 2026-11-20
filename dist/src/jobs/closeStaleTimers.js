"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStaleTimerJob = startStaleTimerJob;
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const taskTimeLog_1 = __importDefault(require("../models/taskTimeLog"));
const timeLogService_1 = require("../service/timeLogService");
const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
function startStaleTimerJob() {
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        try {
            const cutoff = new Date(Date.now() - MAX_SESSION_MS);
            const stale = await taskTimeLog_1.default.findAll({
                where: { ended_at: null, started_at: { [sequelize_1.Op.lt]: cutoff } },
            });
            for (const log of stale) {
                await database_1.sequelize.transaction((t) => (0, timeLogService_1.closeLog)(log, t, {
                    endedAt: new Date(log.started_at.getTime() + MAX_SESSION_MS),
                    autoClosed: true,
                }));
            }
        }
        catch (e) {
            console.error('Stale timer job failed', e);
        }
    });
}
//# sourceMappingURL=closeStaleTimers.js.map