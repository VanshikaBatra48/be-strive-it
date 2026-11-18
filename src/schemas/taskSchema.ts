
import { z } from 'zod';

// -------------------------------------
// ENUMS
// -------------------------------------

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

// -------------------------------------
// COMMON VALIDATIONS
// -------------------------------------

const taskIdParams = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid task ID'),
});

// HTTP/HTTPS URL validation
const httpUrlSchema = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine(
    (val) => /^https?:\/\//i.test(val),
    'URL must start with http:// or https://'
  );

// Optional URL validation
const optionalUrlSchema = z.preprocess(
  (v) => (v === '' ? null : v),
  httpUrlSchema.nullable().optional()
);

// -------------------------------------
// ESTIMATED HOURS VALIDATION
// -------------------------------------

const estimatedHoursValue = z.coerce
  .number()
  .int('Estimated hours must be a whole number')
  .positive('Estimated hours must be positive')
  .max(1000, 'Estimated hours cannot exceed 1000');

// CREATE: Missing, blank, or null => undefined
const estimatedHoursOnCreate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  estimatedHoursValue.optional()
);

// UPDATE: Missing => unchanged, blank/null => clear
const estimatedHoursOnUpdate = z.preprocess(
  (v) => (v === '' ? null : v),
  estimatedHoursValue.nullable().optional()
);

// -------------------------------------
// COMMON TASK FIELDS
// -------------------------------------

const descriptionField = z
  .string()
  .trim()
  .max(10000, 'Description is too long');

const taskFields = {
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(255),

  description: descriptionField,

  category: z.enum(TASK_CATEGORIES),

  priority: z.enum(TASK_PRIORITIES),

  start_date: z.coerce.date({
    message: 'Valid start_date is required',
  }),

  due_date: z.coerce.date({
    message: 'Valid due_date is required',
  }),

  estimated_hours: estimatedHoursOnCreate,

  mentee_id: z.coerce
    .number()
    .int()
    .positive('Invalid mentee ID'),
};

const dueAfterStart = {
  message: 'due_date must be on or after start_date',
  path: ['due_date'],
};

// -------------------------------------
// CREATE TASK
// POST /api/tasks
// -------------------------------------

export const createTaskSchema = z.object({
  body: z
    .object({
      ...taskFields,

      description: descriptionField.default(''),

      category: z.enum(TASK_CATEGORIES).default('upskill'),

      priority: z.enum(TASK_PRIORITIES).default('medium'),

      estimated_hours: estimatedHoursOnCreate,
    })
    .refine(
      (t) => t.due_date >= t.start_date,
      dueAfterStart
    ),
});

// -------------------------------------
// UPDATE TASK
// PATCH /api/tasks/:id
// -------------------------------------

export const updateTaskSchema = z.object({
  params: taskIdParams,

  body: z
    .object({
      title: taskFields.title.optional(),

      description: taskFields.description.optional(),

      category: taskFields.category.optional(),

      priority: taskFields.priority.optional(),

      start_date: taskFields.start_date.optional(),

      due_date: taskFields.due_date.optional(),

      mentee_id: taskFields.mentee_id.optional(),

      estimated_hours: estimatedHoursOnUpdate,

      status: z.enum(TASK_STATUSES).optional(),
    })
    .refine(
      (t) => Object.keys(t).length > 0,
      {
        message: 'Provide at least one field to update',
      }
    )
    .refine(
      (t) =>
        !t.start_date ||
        !t.due_date ||
        t.due_date >= t.start_date,
      dueAfterStart
    ),
});

// -------------------------------------
// SUBMIT TASK
// PATCH /api/tasks/:id/submit
// -------------------------------------

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

// -------------------------------------
// EVALUATE TASK
// PATCH /api/tasks/:id/evaluate
// -------------------------------------

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

      feedback: z
        .string()
        .trim()
        .min(1, 'Feedback is required')
        .max(5000),

      status: z
        .enum(['complete', 'needs-revision'])
        .default('complete'),
    })
    .refine(
      (data) =>
        data.status !== 'complete' ||
        (data.score !== undefined && data.score !== null),
      {
        message: 'Score (0-100) is required when marking a task complete',
        path: ['score'],
      }
    ),
});

// -------------------------------------
// UPDATE TASK STATUS
// PATCH /api/tasks/:id/status
// -------------------------------------

export const updateTaskStatusSchema = z.object({
  params: taskIdParams,

  body: z.object({
    status: z.enum(TASK_STATUSES),
  }),
});

// -------------------------------------
// GET / DELETE TASK
// GET/DELETE /api/tasks/:id
// -------------------------------------

export const taskIdParamSchema = z.object({
  params: taskIdParams,
});

// -------------------------------------
// LIST TASKS
// GET /api/tasks
// -------------------------------------

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

// -------------------------------------
// TYPESCRIPT TYPES
// -------------------------------------

export type CreateTaskInput =
  z.infer<typeof createTaskSchema>['body'];

export type UpdateTaskInput =
  z.infer<typeof updateTaskSchema>['body'];

export type UpdateTaskStatusInput =
  z.infer<typeof updateTaskStatusSchema>['body'];

export type SubmitTaskInput =
  z.infer<typeof submitTaskSchema>['body'];

export type EvaluateTaskInput =
  z.infer<typeof evaluateTaskSchema>['body'];

export type ListTasksQuery =
  z.infer<typeof listTasksQuerySchema>['query'];
