"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStaleTimerJob = startStaleTimerJob;
const node_cron_1 = __importDefault(require("node-cron"));
const timeLogService_1 = require("../service/timeLogService");
function startStaleTimerJob() {
    // Check every minute so an 8-hour session is closed promptly when it reaches 8 hours
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await (0, timeLogService_1.closeStaleLogs)();
        }
        catch (e) {
            console.error('Stale timer job failed', e);
        }
    });
}
//# sourceMappingURL=closeStaleTimers.js.map