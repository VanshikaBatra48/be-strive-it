"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTaskBlocker = exports.sendTaskBlockerMessage = exports.getTaskBlockerMessages = exports.getTaskBlockerConversation = exports.getTaskBlockerById = exports.listTaskBlockers = exports.raiseTaskBlocker = void 0;
const taskBlockerService_1 = require("../service/taskBlockerService");
const handleError = (res, error) => {
    const err = error;
    // Two simultaneous "raise" requests hit the unique index
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            success: false,
            message: 'An open blocker already exists for this task',
        });
    }
    const status = err.statusCode || 500;
    if (status >= 500)
        console.error('Task blocker error:', err);
    return res.status(status).json({
        success: false,
        // Never leak internal/database messages on server errors
        message: status >= 500 ? 'Internal server error' : err.message,
    });
};
const getAuthUser = (req) => {
    const id = Number(req.user?.id);
    const role = req.user?.role;
    if (!Number.isInteger(id) || id <= 0 || !role) {
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }
    return { id, role };
};
const parseId = (value, label) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error(`Invalid ${label}`);
        error.statusCode = 400;
        throw error;
    }
    return id;
};
// POST /api/blockers   (taskId in body)
// POST /api/blockers/tasks/:taskId
const raiseTaskBlocker = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const taskId = parseId(req.params.taskId ?? req.body?.taskId, 'task ID');
        const result = await (0, taskBlockerService_1.raiseBlocker)(taskId, user.id, req.body?.message);
        return res.status(201).json({
            success: true,
            message: 'Blocker raised successfully',
            data: {
                conversation: result.conversation,
                message: result.message,
                recipientId: result.mentorId,
            },
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.raiseTaskBlocker = raiseTaskBlocker;
// GET /api/blockers?status=open|resolved
const listTaskBlockers = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const blockers = await (0, taskBlockerService_1.listBlockers)(user, status);
        return res.status(200).json({ success: true, data: blockers });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.listTaskBlockers = listTaskBlockers;
// GET /api/blockers/:conversationId
const getTaskBlockerById = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const conversationId = parseId(req.params.conversationId, 'conversation ID');
        const conversation = await (0, taskBlockerService_1.getBlockerById)(conversationId, user);
        return res.status(200).json({ success: true, data: conversation });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.getTaskBlockerById = getTaskBlockerById;
// GET /api/blockers/tasks/:taskId
const getTaskBlockerConversation = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const taskId = parseId(req.params.taskId, 'task ID');
        const conversation = await (0, taskBlockerService_1.getBlockerConversation)(taskId, user);
        return res.status(200).json({ success: true, data: conversation });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.getTaskBlockerConversation = getTaskBlockerConversation;
// GET /api/blockers/:conversationId/messages
const getTaskBlockerMessages = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const conversationId = parseId(req.params.conversationId, 'conversation ID');
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await (0, taskBlockerService_1.getBlockerMessages)(conversationId, user, page, limit);
        return res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.getTaskBlockerMessages = getTaskBlockerMessages;
// POST /api/blockers/:conversationId/messages
const sendTaskBlockerMessage = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const conversationId = parseId(req.params.conversationId, 'conversation ID');
        const result = await (0, taskBlockerService_1.sendBlockerMessage)(conversationId, user.id, req.body?.message);
        return res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message: result.message, recipientId: result.recipientId },
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.sendTaskBlockerMessage = sendTaskBlockerMessage;
// PATCH /api/blockers/:conversationId/resolve
const resolveTaskBlocker = async (req, res) => {
    try {
        const user = getAuthUser(req);
        const conversationId = parseId(req.params.conversationId, 'conversation ID');
        const result = await (0, taskBlockerService_1.resolveBlocker)(conversationId, user);
        return res.status(200).json({
            success: true,
            message: 'Blocker resolved successfully',
            data: {
                conversation: result.conversation,
                task: result.task,
                recipientId: result.mentorId,
            },
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
exports.resolveTaskBlocker = resolveTaskBlocker;
//# sourceMappingURL=taskBlockerController.js.map