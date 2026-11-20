"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTaskController = exports.evaluateTaskController = exports.submitTaskController = exports.updateTaskStatusController = exports.updateTaskController = exports.getTaskByIdController = exports.getAllTasksController = exports.createTaskController = void 0;
const taskService_1 = require("../service/taskService");
function getActor(req) {
    if (!req.user)
        return null;
    return {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        assignedMentees: req.user.assignedMentees,
    };
}
function handleTaskError(error, res, next) {
    if (error instanceof taskService_1.ServiceError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
        return;
    }
    next(error);
}
// CREATE TASK (Admin & Mentor)
const createTaskController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { title, description, category, priority, start_date, due_date, estimated_hours, mentee_id, } = req.body;
        const task = await (0, taskService_1.createTask)({
            title,
            description,
            category,
            priority,
            start_date: new Date(start_date),
            due_date: new Date(due_date),
            estimated_hours: estimated_hours === null || estimated_hours === undefined || String(estimated_hours).trim() === ''
                ? null
                : Number(estimated_hours),
            mentee_id: Number(mentee_id),
            assigned_by: actor.id,
        }, actor);
        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.createTaskController = createTaskController;
// GET ALL TASKS (Role-scoped)
const getAllTasksController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const q = (req.validatedQuery ?? req.query);
        const filters = {};
        if (q.mentee_id !== undefined)
            filters.mentee_id = Number(q.mentee_id);
        if (q.assigned_by !== undefined)
            filters.assigned_by = Number(q.assigned_by);
        if (typeof q.status === 'string')
            filters.status = q.status;
        if (typeof q.category === 'string')
            filters.category = q.category;
        if (typeof q.priority === 'string')
            filters.priority = q.priority;
        if (q.page !== undefined)
            filters.page = Number(q.page);
        if (q.limit !== undefined)
            filters.limit = Number(q.limit);
        const { rows, count, page, limit } = await (0, taskService_1.getAllTasks)(filters, actor);
        return res.status(200).json({
            success: true,
            message: 'Tasks fetched successfully',
            count: rows.length,
            total: count,
            page,
            totalPages: limit ? Math.max(1, Math.ceil(count / limit)) : 1,
            data: rows,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.getAllTasksController = getAllTasksController;
// GET TASK BY ID (Role-scoped)
const getTaskByIdController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const task = await (0, taskService_1.getTaskById)(Number(req.params.id), actor);
        return res.status(200).json({
            success: true,
            message: 'Task fetched successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.getTaskByIdController = getTaskByIdController;
// UPDATE TASK (Admin & owning Mentor)
const updateTaskController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { title, description, category, priority, start_date, due_date, estimated_hours, mentee_id, status, } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = String(title);
        if (description !== undefined)
            updateData.description = String(description);
        if (category !== undefined)
            updateData.category = category;
        if (priority !== undefined)
            updateData.priority = priority;
        if (start_date !== undefined)
            updateData.start_date = new Date(String(start_date));
        if (due_date !== undefined)
            updateData.due_date = new Date(String(due_date));
        if (estimated_hours !== undefined) {
            updateData.estimated_hours =
                estimated_hours === null || String(estimated_hours).trim() === ''
                    ? null
                    : Number(estimated_hours);
        }
        if (mentee_id !== undefined)
            updateData.mentee_id = Number(mentee_id);
        if (status !== undefined)
            updateData.status = status;
        const task = await (0, taskService_1.updateTask)(Number(req.params.id), updateData, actor);
        return res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.updateTaskController = updateTaskController;
// UPDATE TASK STATUS (Assigned Mentee, Admin & owning Mentor)
const updateTaskStatusController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { status } = req.body;
        const task = await (0, taskService_1.updateTaskStatus)(Number(req.params.id), status, actor);
        return res.status(200).json({
            success: true,
            message: 'Task status updated successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.updateTaskStatusController = updateTaskStatusController;
// SUBMIT TASK WORK (Assigned Mentee only)
const submitTaskController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { submission_url, demo_url, submission_notes } = req.body;
        const task = await (0, taskService_1.submitTask)(Number(req.params.id), { submission_url, demo_url, submission_notes }, actor);
        return res.status(200).json({
            success: true,
            message: 'Task submitted successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.submitTaskController = submitTaskController;
// EVALUATE TASK SUBMISSION (Admin & owning Mentor)
const evaluateTaskController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { score, feedback, status } = req.body;
        const task = await (0, taskService_1.evaluateTask)(Number(req.params.id), { score, feedback, status }, actor);
        return res.status(200).json({
            success: true,
            message: status === 'complete'
                ? 'Task evaluated and marked complete'
                : 'Revision requested successfully',
            data: task,
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.evaluateTaskController = evaluateTaskController;
// DELETE TASK (Admin & owning Mentor)
const deleteTaskController = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        await (0, taskService_1.deleteTask)(Number(req.params.id), actor);
        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
        });
    }
    catch (error) {
        handleTaskError(error, res, next);
    }
};
exports.deleteTaskController = deleteTaskController;
//# sourceMappingURL=taskController.js.map