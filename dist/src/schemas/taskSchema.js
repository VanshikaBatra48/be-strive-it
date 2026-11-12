"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTasksQuerySchema = exports.taskIdParamSchema = exports.updateTaskStatusSchema = exports.evaluateTaskSchema = exports.submitTaskSchema = exports.updateTaskSchema = exports.createTaskSchema = exports.TASK_PRIORITIES = exports.TASK_STATUSES = exports.TASK_CATEGORIES = void 0;
const zod_1 = require("zod");
exports.TASK_CATEGORIES = [
    'upskill',
    'research',
    'client-project',
    'inhouse-project',
];
exports.TASK_STATUSES = [
    'in-progress',
    'submitted',
    'needs-revision',
    'complete',
    'hold',
];
exports.TASK_PRIORITIES = ['low', 'medium', 'high'];
const taskIdParams = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'Invalid task ID'),
});
const httpUrlSchema = zod_1.z
    .string()
    .trim()
    .url('Must be a valid URL')
    .refine((val) => /^https?:\/\//i.test(val), 'URL must start with http:// or https://');
const optionalUrlSchema = zod_1.z.preprocess((v) => (v === '' ? null : v), httpUrlSchema.nullable().optional());
// Fields a client is allowed to send when creating a task
const taskBodyBase = zod_1.z.object({
    title: zod_1.z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
    description: zod_1.z.string().trim().min(1, 'Description is required').max(10000),
    category: zod_1.z.enum(exports.TASK_CATEGORIES).default('upskill'),
    priority: zod_1.z.enum(exports.TASK_PRIORITIES).default('medium'),
    start_date: zod_1.z.coerce.date({ message: 'Valid start_date is required' }),
    due_date: zod_1.z.coerce.date({ message: 'Valid due_date is required' }),
    estimated_hours: zod_1.z.coerce.number().int().positive('Estimated hours must be positive').max(1000),
    mentee_id: zod_1.z.coerce.number().int().positive('Invalid mentee ID'),
});
const dueAfterStart = {
    message: 'due_date must be on or after start_date',
    path: ['due_date'],
};
// POST /api/tasks
exports.createTaskSchema = zod_1.z.object({
    body: taskBodyBase.refine((t) => t.due_date >= t.start_date, dueAfterStart),
});
// PATCH /api/tasks/:id (every field optional, at least one required)
exports.updateTaskSchema = zod_1.z.object({
    params: taskIdParams,
    body: taskBodyBase
        .partial()
        .extend({ status: zod_1.z.enum(exports.TASK_STATUSES).optional() })
        .refine((t) => Object.keys(t).length > 0, {
        message: 'Provide at least one field to update',
    })
        .refine((t) => !t.start_date || !t.due_date || t.due_date >= t.start_date, dueAfterStart),
});
// PATCH /api/tasks/:id/submit
exports.submitTaskSchema = zod_1.z.object({
    params: taskIdParams,
    body: zod_1.z.object({
        submission_url: httpUrlSchema,
        demo_url: optionalUrlSchema,
        submission_notes: zod_1.z.preprocess((v) => (v === '' ? null : v), zod_1.z.string().trim().max(5000).nullable().optional()),
    }),
});
// PATCH /api/tasks/:id/evaluate
exports.evaluateTaskSchema = zod_1.z.object({
    params: taskIdParams,
    body: zod_1.z
        .object({
        score: zod_1.z.coerce
            .number()
            .int('Score must be a whole number')
            .min(0, 'Score must be between 0 and 100')
            .max(100, 'Score must be between 0 and 100')
            .nullable()
            .optional(),
        feedback: zod_1.z.string().trim().min(1, 'Feedback is required').max(5000),
        status: zod_1.z.enum(['complete', 'needs-revision']).default('complete'),
    })
        .refine((data) => data.status !== 'complete' || (data.score !== undefined && data.score !== null), {
        message: 'Score (0-100) is required when marking a task complete',
        path: ['score'],
    }),
});
// PATCH /api/tasks/:id/status (Admin, owning Mentor, or assigned Mentee)
exports.updateTaskStatusSchema = zod_1.z.object({
    params: taskIdParams,
    body: zod_1.z.object({
        status: zod_1.z.enum(exports.TASK_STATUSES),
    }),
});
// GET/DELETE /api/tasks/:id
exports.taskIdParamSchema = zod_1.z.object({
    params: taskIdParams,
});
// GET /api/tasks?status=...&page=...
exports.listTasksQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(exports.TASK_STATUSES).optional(),
        category: zod_1.z.enum(exports.TASK_CATEGORIES).optional(),
        priority: zod_1.z.enum(exports.TASK_PRIORITIES).optional(),
        mentee_id: zod_1.z.coerce.number().int().positive().optional(),
        assigned_by: zod_1.z.coerce.number().int().positive().optional(),
        page: zod_1.z.coerce.number().int().min(1).optional(),
        limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    }),
});
//# sourceMappingURL=taskSchema.js.map