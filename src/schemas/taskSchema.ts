import { z } from 'zod';

export const TASK_CATEGORIES = [
  'upskill',
  'research',
  'client-project',
  'inhouse-project',
] as const;

export const TASK_STATUSES = [
  'in-progress',
  'submitted',
  'needs-revision',
  'complete',
  'hold',
] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

const taskIdParams = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid task ID'),
});

const httpUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine((val) => /^https?:\/\//i.test(val), 'URL must start with http:// or https://');

const optionalUrlSchema = z.preprocess(
  (v) => (v === '' ? null : v),
  httpUrlSchema.nullable().optional()
);

const optionalHoursSchema = z.preprocess(
  (v) => (v === '' ? null : v),
  z.coerce
    .number()
    .int('Estimated hours must be a whole number')
    .positive('Estimated hours must be positive')
    .max(1000)
    .nullable()
    .optional()
);

// Fields a client is allowed to send when creating a task
const taskBodyBase = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  category: z.enum(TASK_CATEGORIES).default('upskill'),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  start_date: z.coerce.date({ message: 'Valid start_date is required' }),
  due_date: z.coerce.date({ message: 'Valid due_date is required' }),
  estimated_hours: optionalHoursSchema ,
  mentee_id: z.coerce.number().int().positive('Invalid mentee ID'),
});

const dueAfterStart = {
  message: 'due_date must be on or after start_date',
  path: ['due_date'],
};

// POST /api/tasks
export const createTaskSchema = z.object({
  body: taskBodyBase.refine((t) => t.due_date >= t.start_date, dueAfterStart),
});

// PATCH /api/tasks/:id (every field optional, at least one required)
export const updateTaskSchema = z.object({
  params: taskIdParams,
  body: taskBodyBase
    .partial()
    .extend({ status: z.enum(TASK_STATUSES).optional() })
    .refine((t) => Object.keys(t).length > 0, {
      message: 'Provide at least one field to update',
    })
    .refine((t) => !t.start_date || !t.due_date || t.due_date >= t.start_date, dueAfterStart),
});

// PATCH /api/tasks/:id/submit
export const submitTaskSchema = z.object({
  params: taskIdParams,
  body: z.object({
    submission_url: httpUrlSchema,
    demo_url: optionalUrlSchema,
    submission_notes: z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().trim().max(5000).nullable().optional()
    ),
  }),
});

// PATCH /api/tasks/:id/evaluate
export const evaluateTaskSchema = z.object({
  params: taskIdParams,
  body: z
    .object({
      score: z.coerce
        .number()
        .int('Score must be a whole number')
        .min(0, 'Score must be between 0 and 100')
        .max(100, 'Score must be between 0 and 100')
        .nullable()
        .optional(),
      feedback: z.string().trim().min(1, 'Feedback is required').max(5000),
      status: z.enum(['complete', 'needs-revision']).default('complete'),
    })
    .refine(
      (data) => data.status !== 'complete' || (data.score !== undefined && data.score !== null),
      {
        message: 'Score (0-100) is required when marking a task complete',
        path: ['score'],
      }
    ),
});

// PATCH /api/tasks/:id/status (Admin, owning Mentor, or assigned Mentee)
export const updateTaskStatusSchema = z.object({
  params: taskIdParams,
  body: z.object({
    status: z.enum(TASK_STATUSES),
  }),
});

// GET/DELETE /api/tasks/:id
export const taskIdParamSchema = z.object({
  params: taskIdParams,
});

// GET /api/tasks?status=...&page=...
export const listTasksQuerySchema = z.object({
  query: z.object({
    status: z.enum(TASK_STATUSES).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    mentee_id: z.coerce.number().int().positive().optional(),
    assigned_by: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>['body'];
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>['body'];
export type EvaluateTaskInput = z.infer<typeof evaluateTaskSchema>['body'];
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>['query'];