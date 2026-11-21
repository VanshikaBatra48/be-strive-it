"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBlocker = exports.getBlockerMessages = exports.getBlockerConversation = exports.getBlockerById = exports.listBlockers = exports.sendBlockerMessage = exports.raiseBlocker = void 0;
const sequelize_1 = require("sequelize");
const tasks_1 = __importDefault(require("../models/tasks"));
const user_1 = __importDefault(require("../models/user"));
const taskBlockerConversation_1 = __importDefault(require("../models/taskBlockerConversation"));
const taskBlockerMessage_1 = __importDefault(require("../models/taskBlockerMessage"));
const database_1 = require("../config/database");
const notificationService_1 = require("./notificationService");
const timeLogService_1 = require("./timeLogService");
const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
const MAX_MESSAGE_LENGTH = 2000;
const validateMessage = (message) => {
    if (typeof message !== 'string' || !message.trim()) {
        throw createError('Message cannot be empty', 400);
    }
    const clean = message.trim();
    if (clean.length > MAX_MESSAGE_LENGTH) {
        throw createError(`Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters`, 400);
    }
    return clean;
};
const isParticipant = (conversation, userId) => Number(conversation.menteeId) === userId ||
    Number(conversation.mentorId) === userId;
// Admins may VIEW conversations; only mentee/mentor may send messages.
const assertCanView = (conversation, user) => {
    if (user.role !== 'admin' && !isParticipant(conversation, user.id)) {
        throw createError('You cannot access this conversation', 403);
    }
};
const safeNotify = async (payload) => {
    try {
        await (0, notificationService_1.createBlockerNotification)(payload);
    }
    catch (error) {
        console.error('Failed to send blocker notification:', error);
    }
};
// Reused in several queries so the response shape is consistent
const conversationIncludes = [
    { model: tasks_1.default, as: 'task', attributes: ['id', 'title', 'status', 'due_date'] },
    { model: user_1.default, as: 'mentee', attributes: ['id', 'name', 'email'] },
    { model: user_1.default, as: 'mentor', attributes: ['id', 'name', 'email'] },
];
/**
 * 1. Raise a blocker (mentee only; role is also checked in the route).
 *
 * ONE conversation per task:
 *  - no conversation yet  -> create it
 *  - conversation is open -> 409
 *  - conversation resolved -> REOPEN it, so the new message continues
 *    the previous history instead of starting a new thread
 */
const raiseBlocker = async (taskId, menteeId, message) => {
    const cleanMessage = validateMessage(message);
    let result;
    try {
        result = await database_1.sequelize.transaction(async (transaction) => {
            const task = await tasks_1.default.findByPk(taskId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!task)
                throw createError('Task not found', 404);
            if (Number(task.mentee_id) !== menteeId) {
                throw createError('You are not authorized to raise a blocker for this task', 403);
            }
            if (task.status === 'complete') {
                throw createError('Cannot raise a blocker on a completed task', 400);
            }
            // Find the mentor: mentee's mentor_id first, then the task assigner.
            const mentee = await user_1.default.findByPk(menteeId, { transaction });
            const candidateIds = [mentee?.mentor_id, task.assigned_by]
                .filter((id) => id !== null && id !== undefined)
                .map(Number);
            let mentorId = null;
            for (const candidateId of candidateIds) {
                const candidate = await user_1.default.findByPk(candidateId, { transaction });
                if (candidate &&
                    candidate.role === 'mentor' &&
                    candidate.status === 'active') {
                    mentorId = candidate.id;
                    break;
                }
            }
            if (!mentorId) {
                throw createError('No active mentor is assigned to this mentee', 400);
            }
            // The single conversation for this task (if any)
            let conversation = await taskBlockerConversation_1.default.findOne({
                where: { taskId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            let reopened = false;
            if (!conversation) {
                conversation = await taskBlockerConversation_1.default.create({ taskId, menteeId, mentorId, status: 'open' }, { transaction });
            }
            else if (conversation.status === 'open') {
                throw createError('An open blocker already exists for this task', 409);
            }
            else {
                // Resolved earlier: reopen the same conversation.
                // Refresh the people in case the task or mentor changed since.
                await conversation.update({ status: 'open', menteeId, mentorId }, { transaction });
                reopened = true;
            }
            const blockerMessage = await taskBlockerMessage_1.default.create({
                conversationId: conversation.id,
                senderId: menteeId,
                message: cleanMessage,
            }, { transaction });
            await task.update({ status: 'blocker' }, { transaction });
            await (0, timeLogService_1.closeActiveLogForTask)(task.id, transaction);
            return { conversation, message: blockerMessage, task, mentorId, reopened };
        });
    }
    catch (error) {
        // Two simultaneous requests can both pass the check above;
        // the unique index on taskId stops the second one.
        if (error instanceof sequelize_1.UniqueConstraintError) {
            throw createError('An open blocker already exists for this task', 409);
        }
        throw error;
    }
    // After commit
    await safeNotify({
        recipientId: result.mentorId,
        senderId: menteeId,
        conversationId: result.conversation.id,
        taskId,
        type: 'BLOCKER_RAISED',
        title: result.reopened ? 'Task Blocker Reopened' : 'New Task Blocker',
        message: result.reopened
            ? `A mentee has reopened the blocker on "${result.task.title}".`
            : `A mentee has raised a blocker on "${result.task.title}".`,
    });
    return result;
};
exports.raiseBlocker = raiseBlocker;
/**
 * 2. Send a message (mentee or mentor who belongs to the conversation).
 */
const sendBlockerMessage = async (conversationId, senderId, message) => {
    const cleanMessage = validateMessage(message);
    const result = await database_1.sequelize.transaction(async (transaction) => {
        const conversation = await taskBlockerConversation_1.default.findByPk(conversationId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!conversation)
            throw createError('Blocker conversation not found', 404);
        if (!isParticipant(conversation, senderId)) {
            throw createError('You cannot access this conversation', 403);
        }
        if (conversation.status !== 'open') {
            throw createError('This blocker conversation is resolved', 400);
        }
        const newMessage = await taskBlockerMessage_1.default.create({ conversationId, senderId, message: cleanMessage }, { transaction });
        // Bump updatedAt so lists can sort by latest activity
        conversation.changed('updatedAt', true);
        await conversation.save({ transaction });
        const recipientId = Number(conversation.menteeId) === senderId
            ? Number(conversation.mentorId)
            : Number(conversation.menteeId);
        return { conversation, message: newMessage, recipientId };
    });
    await safeNotify({
        recipientId: result.recipientId,
        senderId,
        conversationId,
        taskId: result.conversation.taskId,
        type: 'BLOCKER_MESSAGE',
        title: 'New Blocker Message',
        message: 'You have received a new message in a blocker conversation.',
    });
    return result;
};
exports.sendBlockerMessage = sendBlockerMessage;
/**
 * 3. List blockers for the logged-in user (by role).
 */
const listBlockers = async (user, status) => {
    const where = {};
    if (user.role === 'mentee')
        where.menteeId = user.id;
    else if (user.role === 'mentor')
        where.mentorId = user.id;
    // admin: no filter (all blockers)
    if (status === 'open' || status === 'resolved')
        where.status = status;
    return taskBlockerConversation_1.default.findAll({
        where,
        include: conversationIncludes,
        order: [['updatedAt', 'DESC']],
    });
};
exports.listBlockers = listBlockers;
/**
 * 4. One conversation with task, people, messages and senders.
 */
const getBlockerById = async (conversationId, user) => {
    const conversation = await taskBlockerConversation_1.default.findByPk(conversationId, {
        include: [
            ...conversationIncludes,
            {
                model: taskBlockerMessage_1.default,
                as: 'messages',
                include: [
                    { model: user_1.default, as: 'sender', attributes: ['id', 'name', 'role'] },
                ],
            },
        ],
        order: [[{ model: taskBlockerMessage_1.default, as: 'messages' }, 'createdAt', 'ASC']],
    });
    if (!conversation)
        throw createError('Blocker conversation not found', 404);
    assertCanView(conversation, user);
    return conversation;
};
exports.getBlockerById = getBlockerById;
/**
 * 5. The conversation for a task (there is only ever one per task).
 */
const getBlockerConversation = async (taskId, user) => {
    const conversation = await taskBlockerConversation_1.default.findOne({
        where: { taskId },
    });
    if (!conversation)
        throw createError('No blocker conversation found', 404);
    assertCanView(conversation, user);
    return (0, exports.getBlockerById)(conversation.id, user);
};
exports.getBlockerConversation = getBlockerConversation;
/**
 * 6. Messages with pagination (oldest to newest within the page).
 */
const getBlockerMessages = async (conversationId, user, page = 1, limit = 20) => {
    const conversation = await taskBlockerConversation_1.default.findByPk(conversationId);
    if (!conversation)
        throw createError('Blocker conversation not found', 404);
    assertCanView(conversation, user);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const { count, rows } = await taskBlockerMessage_1.default.findAndCountAll({
        where: { conversationId },
        include: [{ model: user_1.default, as: 'sender', attributes: ['id', 'name', 'role'] }],
        order: [['createdAt', 'DESC']], // camelCase column in these tables
        limit: safeLimit,
        offset: (safePage - 1) * safeLimit,
    });
    return {
        messages: rows.reverse(),
        pagination: {
            totalMessages: count,
            currentPage: safePage,
            totalPages: Math.ceil(count / safeLimit),
            limit: safeLimit,
        },
    };
};
exports.getBlockerMessages = getBlockerMessages;
/**
 * 7. Resolve a blocker.
 * ONLY the mentee who raised it can do this.
 * The conversation is kept (status = resolved) so it can be reopened later.
 */
const resolveBlocker = async (conversationId, user) => {
    if (user.role !== 'mentee') {
        throw createError('Only mentees can resolve a blocker', 403);
    }
    const result = await database_1.sequelize.transaction(async (transaction) => {
        const conversation = await taskBlockerConversation_1.default.findByPk(conversationId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!conversation)
            throw createError('Blocker conversation not found', 404);
        if (Number(conversation.menteeId) !== user.id) {
            throw createError('Only the mentee who raised this blocker can resolve it', 403);
        }
        if (conversation.status === 'resolved') {
            throw createError('This blocker is already resolved', 400);
        }
        await conversation.update({ status: 'resolved' }, { transaction });
        const task = await tasks_1.default.findByPk(conversation.taskId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!task)
            throw createError('Associated task not found', 404);
        // Only move back to in-progress if it is still a blocker
        if (task.status === 'blocker') {
            await task.update({ status: 'in-progress' }, { transaction });
        }
        return { conversation, task };
    });
    await safeNotify({
        recipientId: Number(result.conversation.mentorId),
        senderId: user.id,
        conversationId: result.conversation.id,
        taskId: result.conversation.taskId,
        type: 'BLOCKER_RESOLVED',
        title: 'Task Blocker Resolved',
        message: 'The mentee has resolved the task blocker.',
    });
    return { ...result, mentorId: Number(result.conversation.mentorId) };
};
exports.resolveBlocker = resolveBlocker;
//# sourceMappingURL=taskBlockerService.js.map