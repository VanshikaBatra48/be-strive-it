"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskTimeController = exports.stopTimerController = exports.getActiveTimerController = exports.startTimerController = exports.HttpError = void 0;
const tasks_1 = __importDefault(require("../models/tasks"));
const svc = __importStar(require("../service/timeLogService")); // match your folder: 'service', not 'services'
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
exports.startTimerController = wrap(async (req, res) => {
    const log = await svc.startTimer(Number(req.params.id), req.user.id);
    res.status(201).json({ success: true, data: log });
});
exports.getActiveTimerController = wrap(async (req, res) => {
    const data = await svc.getActiveTimer(req.user.id);
    res.json({ success: true, data }); // data is null when nothing is running
});
exports.stopTimerController = wrap(async (req, res) => {
    const log = await svc.stopTimer(Number(req.params.id), req.user.id, req.body?.note);
    res.json({ success: true, data: log });
});
exports.getTaskTimeController = wrap(async (req, res) => {
    const user = req.user;
    const task = await tasks_1.default.findByPk(Number(req.params.id));
    if (!task)
        throw new HttpError(404, 'Task not found');
    const allowed = user.role === 'admin' ||
        task.mentee_id === user.id ||
        task.assigned_by === user.id;
    if (!allowed)
        throw new HttpError(403, 'Forbidden');
    res.json({ success: true, data: await svc.getTaskTimeSummary(task.id) });
});
//# sourceMappingURL=timeLogController.js.map