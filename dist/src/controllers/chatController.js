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
const zod_1 = require("zod");
const chat = __importStar(require("../service/chatService"));
const chatService_1 = require("../service/chatService");
// ---------- Validation ----------
const idSchema = zod_1.z.coerce.number().int().positive();
const createGroupBody = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Group name is too short').max(120),
    description: zod_1.z.string().trim().max(500).optional().nullable(),
    memberIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'Select members').max(200),
    taskId: zod_1.z.number().int().positive().optional().nullable(),
});
const memberIdsBody = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1).max(200),
});
const messageQuery = zod_1.z.object({
    before: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
// ---------- Helpers ----------
const actorOf = (req) => {
    if (!req.user)
        throw new chatService_1.ChatError('Authentication required', 401);
    return req.user;
};
/** One place that turns thrown errors into JSON responses. */
const wrap = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    }
    catch (err) {
        if (err instanceof chatService_1.ChatError) {
            res.status(err.statusCode).json({ success: false, message: err.message });
            return;
        }
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({ success: false, message: err.issues[0]?.message ?? 'Invalid request' });
            return;
        }
        console.error('Chat error:', err);
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};
// ---------- Handlers ----------
const chatController = {
    listGroups: wrap(async (req, res) => {
        const actor = actorOf(req);
        const data = req.query.scope === 'all' ? await chat.listAllGroups(actor) : await chat.listGroups(actor);
        res.json({ success: true, data });
    }),
    getGroup: wrap(async (req, res) => {
        const data = await chat.getGroupDetail(actorOf(req), idSchema.parse(req.params.groupId));
        res.json({ success: true, data });
    }),
    createGroup: wrap(async (req, res) => {
        const body = createGroupBody.parse(req.body);
        const data = await chat.createGroup(actorOf(req), body);
        res.status(201).json({ success: true, data });
    }),
    addMembers: wrap(async (req, res) => {
        const { userIds } = memberIdsBody.parse(req.body);
        const data = await chat.addMembers(actorOf(req), idSchema.parse(req.params.groupId), userIds);
        res.json({ success: true, data });
    }),
    removeMember: wrap(async (req, res) => {
        const data = await chat.removeMember(actorOf(req), idSchema.parse(req.params.groupId), idSchema.parse(req.params.userId));
        res.json({ success: true, data });
    }),
    archiveGroup: wrap(async (req, res) => {
        const data = await chat.archiveGroup(actorOf(req), idSchema.parse(req.params.groupId));
        res.json({ success: true, data });
    }),
    getMessages: wrap(async (req, res) => {
        const query = messageQuery.parse(req.query);
        const data = await chat.getMessages(actorOf(req), idSchema.parse(req.params.groupId), query);
        res.json({ success: true, data });
    }),
    sendMessage: wrap(async (req, res) => {
        const files = req.files ?? [];
        try {
            const body = typeof req.body?.body === 'string' ? req.body.body : '';
            const data = await chat.sendMessage(actorOf(req), idSchema.parse(req.params.groupId), {
                body,
                files,
            });
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            await chat.cleanupUploadedFiles(files); // don't leave orphan files if the message failed
            throw err;
        }
    }),
    deleteMessage: wrap(async (req, res) => {
        const data = await chat.deleteMessage(actorOf(req), idSchema.parse(req.params.groupId), idSchema.parse(req.params.messageId));
        res.json({ success: true, data });
    }),
    markRead: wrap(async (req, res) => {
        const { messageId } = zod_1.z.object({ messageId: zod_1.z.number().int().positive() }).parse(req.body);
        await chat.markRead(actorOf(req), idSchema.parse(req.params.groupId), messageId);
        res.json({ success: true });
    }),
    /** Files are only reachable through this authenticated route. */
    downloadAttachment: wrap(async (req, res) => {
        const { filePath, mimeType, originalName } = await chat.getAttachmentFile(actorOf(req), idSchema.parse(req.params.attachmentId));
        const inline = mimeType.startsWith('image/');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache');
        res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(originalName)}`);
        res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) {
                res.status(404).json({ success: false, message: 'File not found' });
            }
        });
    }),
};
exports.default = chatController;
//# sourceMappingURL=chatController.js.map