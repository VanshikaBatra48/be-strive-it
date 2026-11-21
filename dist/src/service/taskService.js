"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTaskStatus = exports.evaluateTask = exports.submitTask = exports.updateTask = exports.getTaskById = exports.getAllTasks = exports.createTask = exports.ServiceError = void 0;
const sequelize_1 = require("sequelize");
const tasks_1 = __importDefault(require("../models/tasks"));
const user_1 = __importDefault(require("../models/user"));
const imageKitService_1 = require("./imageKitService");
const associations_1 = require("../models/associations");
const notificationService_1 = require("../service/notificationService");
const chatService_1 = require("../service/chatService");
const timeLogService_1 = require("./timeLogService");
// Ensure Sequelize associations are registered before any included queries
(0, associations_1.initAssociations)();
class ServiceError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ServiceError';
    }
}
exports.ServiceError = ServiceError;
const TASK_USER_INCLUDES = [
    { model: user_1.default, as: 'mentee', attributes: ['id', 'name', 'email'] },
    { model: user_1.default, as: 'assigner', attributes: ['id', 'name', 'email'] },
    { model: user_1.default, as: 'evaluator', attributes: ['id', 'name', 'email'] },
];
/** Collect IDs of all mentees assigned to the given mentor (FK, name & JSONB links). */
async function getMentorMenteeIds(actor) {
    const rows = await user_1.default.findAll({
        where: {
            role: 'mentee',
            [sequelize_1.Op.or]: [
                { mentor_id: actor.id },
                { assigned_to: { [sequelize_1.Op.iLike]: actor.name.trim() } },
            ],
        },
        attributes: ['id'],
    });
    const ids = new Set(Array.isArray(actor.assignedMentees) ? actor.assignedMentees : []);
    for (const row of rows) {
        ids.add(row.id);
    }
    return Array.from(ids);
}
/** Verify the target user exists, is an active mentee, and belongs to actor if actor is a mentor. */
async function validateTargetMentee(menteeId, actor) {
    const mentee = await user_1.default.findByPk(menteeId);
    if (!mentee || mentee.role !== 'mentee') {
        throw new ServiceError(400, 'Selected recipient must be a valid mentee');
    }
    if (mentee.status !== 'active') {
        throw new ServiceError(400, 'Cannot assign a task to an inactive mentee');
    }
    if (actor.role === 'mentor') {
        const mentorMenteeIds = await getMentorMenteeIds(actor);
        const assignedByFk = mentee.mentor_id === actor.id;
        const assignedNameMatches = mentee.assigned_to?.trim().toLowerCase() === actor.name.trim().toLowerCase();
        if (!assignedByFk && !assignedNameMatches && !mentorMenteeIds.includes(mentee.id)) {
            throw new ServiceError(403, 'You can only assign tasks to mentees assigned to you');
        }
    }
}
/** Verify actor has permission to view/manage a task based on role and ownership. */
async function assertMentorCanAccess(task, actor) {
    if (actor.role === 'admin')
        return;
    if (actor.role === 'mentor') {
        if (task.assigned_by === actor.id)
            return;
        const menteeIds = await getMentorMenteeIds(actor);
        if (menteeIds.includes(task.mentee_id))
            return;
    }
    throw new ServiceError(403, 'You do not have permission to access this task');
}
function validateTaskDates(startDate, dueDate) {
    const s = new Date(startDate);
    const d = new Date(dueDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(d.getTime())) {
        throw new ServiceError(400, 'Valid start_date and due_date are required');
    }
    if (s > d) {
        throw new ServiceError(400, 'due_date must be on or after start_date');
    }
}
/** Fetch a single task hydrated with user associations. */
async function fetchHydratedTask(id) {
    return tasks_1.default.findByPk(id, { include: TASK_USER_INCLUDES });
}
// Create a new task
const createTask = async (taskData, actor) => {
    validateTaskDates(taskData.start_date, taskData.due_date);
    // Estimated hours is optional; validate only when provided
    const estimatedHours = taskData.estimated_hours ?? null;
    if (estimatedHours !== null &&
        (!Number.isFinite(estimatedHours) || estimatedHours <= 0)) {
        throw new ServiceError(400, 'Estimated hours must be greater than zero');
    }
    await validateTargetMentee(taskData.mentee_id, actor);
    const created = await tasks_1.default.create({
        title: taskData.title.trim(),
        description: (taskData.description ?? '').trim(),
        category: taskData.category ?? 'upskill',
        priority: taskData.priority ?? 'medium',
        start_date: taskData.start_date,
        due_date: taskData.due_date,
        estimated_hours: estimatedHours,
        mentee_id: taskData.mentee_id,
        assigned_by: actor.id,
        attachments: taskData.attachments || [],
        status: 'in-progress',
    });
    // Mentee gets TASK_ASSIGNED notification
    await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskAssigned)(created.mentee_id, created, actor.name));
    const hydrated = await fetchHydratedTask(created.id);
    return hydrated ?? created;
};
exports.createTask = createTask;
// Get all tasks scoped by caller role
const getAllTasks = async (filters = {}, actor) => {
    const andConditions = [];
    if (filters.status)
        andConditions.push({ status: filters.status });
    if (filters.category)
        andConditions.push({ category: filters.category });
    if (filters.priority)
        andConditions.push({ priority: filters.priority });
    if (actor.role === 'mentee') {
        if (filters.mentee_id !== undefined && filters.mentee_id !== actor.id) {
            return { rows: [], count: 0, page: filters.page ?? 1, limit: filters.limit ?? null };
        }
        andConditions.push({ mentee_id: actor.id });
        if (filters.assigned_by !== undefined) {
            andConditions.push({ assigned_by: filters.assigned_by });
        }
    }
    else if (actor.role === 'mentor') {
        const menteeIds = await getMentorMenteeIds(actor);
        const mentorScopeOr = [{ assigned_by: actor.id }];
        if (menteeIds.length > 0) {
            mentorScopeOr.push({ mentee_id: { [sequelize_1.Op.in]: menteeIds } });
        }
        andConditions.push({ [sequelize_1.Op.or]: mentorScopeOr });
        if (filters.mentee_id !== undefined) {
            andConditions.push({ mentee_id: filters.mentee_id });
        }
        if (filters.assigned_by !== undefined) {
            andConditions.push({ assigned_by: filters.assigned_by });
        }
    }
    else {
        // Admin sees all tasks and can filter freely
        if (filters.mentee_id !== undefined) {
            andConditions.push({ mentee_id: filters.mentee_id });
        }
        if (filters.assigned_by !== undefined) {
            andConditions.push({ assigned_by: filters.assigned_by });
        }
    }
    const where = andConditions.length > 0 ? { [sequelize_1.Op.and]: andConditions } : {};
    const usePagination = filters.page !== undefined || filters.limit !== undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const result = await tasks_1.default.findAndCountAll({
        where,
        include: TASK_USER_INCLUDES,
        order: [['createdAt', 'DESC']],
        ...(usePagination ? { limit, offset: (page - 1) * limit } : {}),
        distinct: true,
    });
    return {
        rows: result.rows,
        count: result.count,
        page: usePagination ? page : 1,
        limit: usePagination ? limit : null,
    };
};
exports.getAllTasks = getAllTasks;
// Get task by ID (with ownership verification)
const getTaskById = async (id, actor) => {
    const task = await fetchHydratedTask(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    if (actor.role === 'mentee') {
        if (task.mentee_id !== actor.id) {
            throw new ServiceError(403, 'You do not have permission to access this task');
        }
        return task;
    }
    await assertMentorCanAccess(task, actor);
    return task;
};
exports.getTaskById = getTaskById;
// Update task (Admin & owning Mentor only)
const updateTask = async (id, updateData, actor) => {
    const task = await tasks_1.default.findByPk(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    await assertMentorCanAccess(task, actor);
    if (updateData.status === 'complete' || updateData.status === 'needs-revision') {
        throw new ServiceError(400, 'Use the evaluate endpoint to approve or request revision');
    }
    if (updateData.status === 'submitted') {
        throw new ServiceError(400, 'Tasks can only be submitted by the assigned mentee');
    }
    if (updateData.estimated_hours !== undefined &&
        updateData.estimated_hours !== null &&
        (!Number.isFinite(updateData.estimated_hours) || updateData.estimated_hours <= 0)) {
        throw new ServiceError(400, 'Estimated hours must be greater than zero');
    }
    const startDate = updateData.start_date ?? task.start_date;
    const dueDate = updateData.due_date ?? task.due_date;
    validateTaskDates(startDate, dueDate);
    if (updateData.estimated_hours !== undefined &&
        updateData.estimated_hours !== null &&
        (!Number.isFinite(updateData.estimated_hours) || updateData.estimated_hours <= 0)) {
        throw new ServiceError(400, 'Estimated hours must be greater than zero');
    }
    if (updateData.mentee_id !== undefined && updateData.mentee_id !== task.mentee_id) {
        await validateTargetMentee(updateData.mentee_id, actor);
    }
    const sanitizedUpdates = { ...updateData };
    if (sanitizedUpdates.title !== undefined) {
        sanitizedUpdates.title = sanitizedUpdates.title.trim();
    }
    if (sanitizedUpdates.description !== undefined) {
        sanitizedUpdates.description = sanitizedUpdates.description.trim();
    }
    const previousMenteeId = task.mentee_id;
    const dueDateChanged = updateData.due_date !== undefined &&
        new Date(updateData.due_date).getTime() !== new Date(task.due_date).getTime();
    await task.update({
        ...sanitizedUpdates,
        ...(dueDateChanged ? { due_reminder_sent: false } : {}),
    });
    if (sanitizedUpdates.status === 'hold' ||
        sanitizedUpdates.status === 'blocker' ||
        sanitizedUpdates.status === 'submitted' ||
        sanitizedUpdates.status === 'complete') {
        await (0, timeLogService_1.closeActiveLogForTask)(task.id);
    }
    // Reassignment handlers
    if (updateData.mentee_id !== undefined && updateData.mentee_id !== previousMenteeId) {
        await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskAssigned)(task.mentee_id, task, actor.name));
        // Synchronize chat memberships for this task
        await (0, chatService_1.removeUserFromTaskGroups)(task.id, previousMenteeId).catch(() => undefined);
        await (0, chatService_1.addUsersToTaskGroups)(task.id, [task.mentee_id]).catch(() => undefined);
    }
    if (actor.role === 'admin' && task.assigned_by !== actor.id) {
        await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskUpdated)(task.assigned_by, task, actor.name));
    }
    const hydrated = await fetchHydratedTask(task.id);
    return hydrated ?? task;
};
exports.updateTask = updateTask;
// Submit work for a task (assigned Mentee only)
const submitTask = async (id, input, actor) => {
    const task = await tasks_1.default.findByPk(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    if (actor.role !== 'mentee' || task.mentee_id !== actor.id) {
        throw new ServiceError(403, 'Only the assigned mentee can submit this task');
    }
    if (task.status === 'complete' || task.status === 'hold' || task.status === 'submitted') {
        throw new ServiceError(400, `Cannot submit a task whose status is '${task.status}'`);
    }
    await task.update({
        submission_url: input.submission_url.trim(),
        demo_url: input.demo_url ? input.demo_url.trim() : null,
        submission_notes: input.submission_notes ? input.submission_notes.trim() : null,
        submitted_at: new Date(),
        status: 'submitted',
    });
    // Automatically close any running timer on this task
    await (0, timeLogService_1.closeActiveLogForTask)(task.id);
    // Mentor gets TASK_SUBMITTED notification
    await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskSubmitted)(task.assigned_by, task, actor.name));
    const hydrated = await fetchHydratedTask(task.id);
    return hydrated ?? task;
};
exports.submitTask = submitTask;
// Evaluate a submitted task (Admin & owning Mentor only)
const evaluateTask = async (id, input, actor) => {
    const task = await tasks_1.default.findByPk(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    await assertMentorCanAccess(task, actor);
    if (task.status !== 'submitted') {
        throw new ServiceError(400, 'Task must be in submitted status to be evaluated');
    }
    await task.update({
        score: null,
        feedback: input.feedback.trim(),
        status: input.status,
        evaluated_by: actor.id,
        evaluated_at: new Date(),
    });
    if (input.status === 'needs-revision') {
        await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskChangeRequest)(task.mentee_id, task));
    }
    else {
        await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyEvaluationSubmitted)(task.mentee_id, task));
    }
    const hydrated = await fetchHydratedTask(task.id);
    return hydrated ?? task;
};
exports.evaluateTask = evaluateTask;
// Update task status (Mentee for own task, Admin & owning Mentor)
const updateTaskStatus = async (id, status, actor) => {
    const task = await tasks_1.default.findByPk(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    if (actor.role === 'mentee') {
        if (task.mentee_id !== actor.id) {
            throw new ServiceError(403, 'You can only update the status of your own tasks');
        }
        if (task.status === 'submitted' || task.status === 'complete' || task.status === 'needs-revision') {
            throw new ServiceError(400, `Cannot change status when task is ${task.status}`);
        }
        if (status !== 'in-progress' && status !== 'hold' && status !== 'blocker') {
            throw new ServiceError(400, 'Mentees can only set status to in-progress , hold or blocker');
        }
    }
    else {
        await assertMentorCanAccess(task, actor);
        if (status === 'complete' || status === 'needs-revision') {
            throw new ServiceError(400, 'Use the evaluate endpoint to approve or request revision');
        }
        if (status === 'submitted') {
            throw new ServiceError(400, 'Tasks can only be submitted by the assigned mentee');
        }
    }
    const previousStatus = task.status;
    await task.update({ status });
    if (status === 'hold' || status === 'blocker') {
        await (0, timeLogService_1.closeActiveLogForTask)(task.id);
    }
    if (actor.role === 'mentee' && previousStatus !== status) {
        await (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyTaskStatusChanged)(task.assigned_by, task, actor.name, status));
    }
    const hydrated = await fetchHydratedTask(task.id);
    return hydrated ?? task;
};
exports.updateTaskStatus = updateTaskStatus;
// Delete task (soft delete, Admin & owning Mentor only)
const deleteTask = async (id, actor) => {
    const task = await tasks_1.default.findByPk(id);
    if (!task) {
        throw new ServiceError(404, 'Task not found');
    }
    await assertMentorCanAccess(task, actor);
    // Archive any chat group linked to this task
    await (0, chatService_1.archiveTaskGroups)(task.id).catch(() => undefined);
    // Clean up any ImageKit attachments
    if (Array.isArray(task.attachments) && task.attachments.length > 0) {
        const fileIds = task.attachments.map((a) => a.key || a.id).filter(Boolean);
        if (fileIds.length > 0) {
            void (0, imageKitService_1.bulkDeleteFromImageKit)(fileIds);
        }
    }
    await task.destroy();
    return task;
};
exports.deleteTask = deleteTask;
//# sourceMappingURL=taskService.js.map