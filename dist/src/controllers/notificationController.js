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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
const service = __importStar(require("../service/notificationService"));
async function getNotifications(req, res, next) {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const notifications = await service.listNotifications(req.user.id, limit, offset);
        res.json(notifications);
    }
    catch (err) {
        next(err);
    }
}
async function getUnreadCount(req, res, next) {
    try {
        const count = await service.getUnreadCount(req.user.id);
        res.json({ count });
    }
    catch (err) {
        next(err);
    }
}
async function markAsRead(req, res, next) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid notification id" });
        }
        const affected = await service.markRead(req.user.id, id);
        if (affected === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.sendStatus(204);
    }
    catch (err) {
        next(err);
    }
}
async function markAllAsRead(req, res, next) {
    try {
        await service.markAllRead(req.user.id);
        res.sendStatus(204);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=notificationController.js.map