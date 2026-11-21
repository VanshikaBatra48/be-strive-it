"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlockerNotification = exports.notifyMemberAddedToGroup = exports.notifyGroupCreated = exports.notifyNewMessage = exports.getUnreadCount = exports.listNotifications = exports.notifyMentorTaskDueDate = exports.notifyTaskStatusChanged = exports.notifyTaskSubmitted = exports.notifyTaskUpdated = exports.notifyEvaluationSubmitted = exports.notifyTaskChangeRequest = exports.notifyTaskDueDate = exports.notifyTaskAssigned = exports.MENTOR_TYPES = exports.MENTEE_TYPES = void 0;
exports.createNotification = createNotification;
exports.safeNotify = safeNotify;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const notification_1 = require("../models/notification");
const socket_1 = require("../socket");
/* ---------- Who receives what ---------- */
exports.MENTEE_TYPES = [
    'TASK_ASSIGNED',
    'TASK_DUE_DATE',
    'TASK_CHANGE_REQUEST',
    'EVALUATION_SUBMITTED',
    'NEW_MESSAGE',
    'GROUP_CREATED',
    'ADDED_TO_GROUP',
    'BLOCKER_MESSAGE'
];
exports.MENTOR_TYPES = [
    'TASK_UPDATED',
    'TASK_SUBMITTED',
    'TASK_STATUS_CHANGED',
    'NEW_MESSAGE',
    'GROUP_CREATED',
    'BLOCKER_RAISED', // mentee raised a blocker
    'BLOCKER_MESSAGE', // mentee replied
    'BLOCKER_RESOLVED', // mentee resolved it
];
async function createNotification(input, options = {}) {
    const { transaction } = options;
    const notification = await notification_1.Notification.create({ ...input, data: input.data ?? {} }, { transaction });
    const emit = () => {
        try {
            (0, socket_1.getIO)()
                .to(`user:${input.user_id}`)
                .emit('notification:new', notification.toJSON());
        }
        catch (err) {
            // A failed push must never break the main request
            console.error('Socket emit failed:', err);
        }
    };
    // Inside a transaction, push only after it commits
    if (transaction)
        transaction.afterCommit(emit);
    else
        emit();
    return notification;
}
/** Run a notification without letting its failure break the caller. */
async function safeNotify(fn) {
    try {
        await fn();
    }
    catch (err) {
        console.error('Notification failed:', err);
    }
}
/* ---------- Mentee notifications ---------- */
const notifyTaskAssigned = (mentee_id, task, assignerName, tx) => createNotification({
    user_id: mentee_id,
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: `${assignerName} assigned you "${task.title}"`,
    data: { taskId: task.id },
}, { transaction: tx });
exports.notifyTaskAssigned = notifyTaskAssigned;
function formatDueDate(date) {
    return new Date(date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
    });
}
const notifyTaskDueDate = (mentee_id, task, dueDate, kind = '24h', tx) => createNotification({
    user_id: mentee_id,
    type: 'TASK_DUE_DATE',
    title: kind === '1h' ? 'Task due within 1 hour' : 'Task due within 24 hours',
    message: `"${task.title}" is due on ${formatDueDate(dueDate)}`,
    data: {
        taskId: task.id,
        dueDate: new Date(dueDate).toISOString(),
        reminder: kind,
    },
}, { transaction: tx });
exports.notifyTaskDueDate = notifyTaskDueDate;
const notifyTaskChangeRequest = (mentee_id, task, tx) => createNotification({
    user_id: mentee_id,
    type: 'TASK_CHANGE_REQUEST',
    title: 'Changes requested',
    message: `Your mentor requested changes on "${task.title}"`,
    data: { taskId: task.id },
}, { transaction: tx });
exports.notifyTaskChangeRequest = notifyTaskChangeRequest;
const notifyEvaluationSubmitted = (mentee_id, task, score, tx) => createNotification({
    user_id: mentee_id,
    type: 'EVALUATION_SUBMITTED',
    title: 'Task evaluated',
    message: `Your task "${task.title}" was evaluated.`,
    data: { taskId: task.id },
}, { transaction: tx });
exports.notifyEvaluationSubmitted = notifyEvaluationSubmitted;
/* ---------- Mentor notifications ---------- */
const notifyTaskUpdated = (mentor_id, task, actorName, tx) => createNotification({
    user_id: mentor_id,
    type: 'TASK_UPDATED',
    title: 'Task updated',
    message: `${actorName} updated "${task.title}"`,
    data: { taskId: task.id },
}, { transaction: tx });
exports.notifyTaskUpdated = notifyTaskUpdated;
const notifyTaskSubmitted = (mentor_id, task, menteeName, tx) => createNotification({
    user_id: mentor_id,
    type: 'TASK_SUBMITTED',
    title: 'Task submitted',
    message: `${menteeName} submitted "${task.title}" for review`,
    data: { taskId: task.id },
}, { transaction: tx });
exports.notifyTaskSubmitted = notifyTaskSubmitted;
const notifyTaskStatusChanged = (mentor_id, task, menteeName, status, tx) => createNotification({
    user_id: mentor_id,
    type: 'TASK_STATUS_CHANGED',
    title: 'Task status changed',
    message: `${menteeName} moved "${task.title}" to ${status}`,
    data: { taskId: task.id, status },
}, { transaction: tx });
exports.notifyTaskStatusChanged = notifyTaskStatusChanged;
const notifyMentorTaskDueDate = (mentor_id, menteeName, task, dueDate, kind = '24h', tx) => createNotification({
    user_id: mentor_id,
    type: 'TASK_DUE_DATE',
    title: kind === '1h'
        ? 'Mentee task due within 1 hour'
        : 'Mentee task due within 24 hours',
    message: `${menteeName}'s task "${task.title}" is due on ${formatDueDate(dueDate)}`,
    data: {
        taskId: task.id,
        menteeName,
        dueDate: new Date(dueDate).toISOString(),
        reminder: kind,
    },
}, { transaction: tx });
exports.notifyMentorTaskDueDate = notifyMentorTaskDueDate;
/* ---------- Read side (used by the controller) ---------- */
const listNotifications = (user_id, limit, offset) => notification_1.Notification.findAll({
    where: { user_id },
    order: [['created_at', 'DESC']],
    limit,
    offset,
});
exports.listNotifications = listNotifications;
const getUnreadCount = (user_id) => notification_1.Notification.count({ where: { user_id, is_read: false } });
exports.getUnreadCount = getUnreadCount;
async function markRead(user_id, id) {
    const [affected] = await notification_1.Notification.update({ is_read: true }, { where: { id, user_id } });
    return affected;
}
async function markAllRead(user_id) {
    const [affected] = await notification_1.Notification.update({ is_read: true }, { where: { user_id, is_read: false } });
    return affected;
}
/*---------------Notification that is same in both--------------------------------*/
const notifyNewMessage = (recipientId, groupId, groupName, senderId, senderName, messageId, message, tx) => createNotification({
    user_id: recipientId,
    type: 'NEW_MESSAGE',
    title: `New message in ${groupName}`,
    message: `${senderName}: ${message}`,
    data: {
        groupId,
        groupName,
        senderId,
        senderName,
        messageId,
    },
}, { transaction: tx });
exports.notifyNewMessage = notifyNewMessage;
const notifyGroupCreated = async (userId, groupId, groupName) => {
    return createNotification({
        user_id: userId,
        type: 'GROUP_CREATED',
        title: 'New Group Created',
        message: `You have been added to the group "${groupName}".`,
        data: {
            groupId,
            groupName,
        },
    });
};
exports.notifyGroupCreated = notifyGroupCreated;
const notifyMemberAddedToGroup = async (userId, groupId, groupName) => {
    return createNotification({
        user_id: userId,
        type: 'ADDED_TO_GROUP',
        title: 'Added to Group',
        message: `You have been added to the group "${groupName}".`,
        data: {
            groupId,
            groupName,
        },
    });
};
exports.notifyMemberAddedToGroup = notifyMemberAddedToGroup;
const createBlockerNotification = (data, transaction) => createNotification({
    user_id: data.recipientId,
    type: data.type,
    title: data.title,
    message: data.message,
    data: {
        senderId: data.senderId,
        conversationId: data.conversationId,
        taskId: data.taskId,
    },
}, { transaction });
exports.createBlockerNotification = createBlockerNotification;
//# sourceMappingURL=notificationService.js.map