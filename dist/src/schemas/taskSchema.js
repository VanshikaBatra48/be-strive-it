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
    'blocker'
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
// Estimated hours: whole number, 1-1000.
const estimatedHoursValue = zod_1.z.coerce
    .number()
    .int('Estimated hours must be a whole number')
    .positive('Estimated hours must be positive')
    .max(1000, 'Estimated hours cannot exceed 1000');
// CREATE: optional. Missing / blank / null => undefined (the controller stores null).
const estimatedHoursOnCreate = zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), estimatedHoursValue.optional());
// UPDATE: optional. Omitted => unchanged, null or "" => clear the estimate.
const estimatedHoursOnUpdate = zod_1.z.preprocess((v) => (v === '' ? null : v), estimatedHoursValue.nullable().optional());
// Description may be empty when the mentor only attaches files.
// "description OR at least one attachment" is enforced in the controller/service,
// because files are not part of the body schema.
const descriptionField = zod_1.z.string().trim().max(10000, 'Description is too long');
// Fields shared by create and update (no defaults here, so partial updates
// never overwrite existing values with a default).
const taskFields = {
    title: zod_1.z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
    description: descriptionField,
    category: zod_1.z.enum(exports.TASK_CATEGORIES),
    priority: zod_1.z.enum(exports.TASK_PRIORITIES),
    start_date: zod_1.z.coerce.date({ message: 'Valid start_date is required' }),
    due_date: zod_1.z.coerce.date({ message: 'Valid due_date is required' }),
    mentee_id: zod_1.z.coerce.number().int().positive('Invalid mentee ID'),
};
const dueAfterStart = {
    message: 'Start date must be less than due date',
    path: ['due_date'],
};
// POST /api/tasks  (multipart/form-data: text fields + "attachments" files)
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        ...taskFields,
        description: descriptionField.default(''),
        category: taskFields.category.default('upskill'),
        priority: taskFields.priority.default('medium'),
        estimated_hours: estimatedHoursOnCreate,
    })
        .refine((t) => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return t.start_date >= todayStart;
    }, {
        message: 'Start date cannot be in the past',
        path: ['start_date'],
    })
        .refine((t) => t.due_date.getTime() >= Date.now() - 60000, {
        message: 'Due date cannot be in the past',
        path: ['due_date'],
    })
        .refine((t) => t.start_date < t.due_date, dueAfterStart),
});
// PATCH /api/tasks/:id (every field optional, at least one required)
exports.updateTaskSchema = zod_1.z.object({
    params: taskIdParams,
    body: zod_1.z
        .object({
        title: taskFields.title.optional(),
        description: taskFields.description.optional(),
        category: taskFields.category.optional(),
        priority: taskFields.priority.optional(),
        start_date: taskFields.start_date.optional(),
        due_date: taskFields.due_date.optional(),
        mentee_id: taskFields.mentee_id.optional(),
        estimated_hours: estimatedHoursOnUpdate,
        status: zod_1.z.enum(exports.TASK_STATUSES).optional(),
    })
        .refine((t) => Object.keys(t).length > 0, {
        message: 'Provide at least one field to update',
    })
        .refine((t) => !t.start_date || !t.due_date || t.start_date < t.due_date, dueAfterStart),
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
    body: zod_1.z.object({
        score: zod_1.z.coerce
            .number()
            .int('Score must be a whole number')
            .min(0, 'Score must be between 0 and 100')
            .max(100, 'Score must be between 0 and 100')
            .nullable()
            .optional(),
        feedback: zod_1.z.string().trim().min(1, 'Feedback is required').max(5000),
        status: zod_1.z.enum(['complete', 'needs-revision']).default('complete'),
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