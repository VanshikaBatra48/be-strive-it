import { z } from 'zod';

export const TASK_CATEGORIES = ['upskill', 'research', 'client-project', 'inhouse-project'] as const;
export const TASK_STATUSES = ['in-progress', 'complete', 'hold'] as const;

// Fields a client is allowed to send when creating a task
const taskBaseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  category: z.enum(TASK_CATEGORIES).default('upskill'),
  start_date: z.coerce.date(),
  due_date: z.coerce.date(),
  estimated_hours: z.number().int().positive().max(1000),
  mentee_id: z.number().int().positive(),
});

const dueAfterStart = {
  message: 'due_date must be on or after start_date',
  path: ['due_date'],
};

// POST /tasks
export const createTaskSchema = taskBaseSchema.refine(
  (t) => t.due_date >= t.start_date,
  dueAfterStart
);

// PATCH /tasks/:id (every field optional, at least one required)
export const updateTaskSchema = taskBaseSchema
  .partial()
  .extend({ status: z.enum(TASK_STATUSES).optional() })
  .refine((t) => Object.keys(t).length > 0, { message: 'Provide at least one field to update' })
  .refine(
    (t) => !t.start_date || !t.due_date || t.due_date >= t.start_date,
    dueAfterStart
  );

// GET/PATCH/DELETE /tasks/:id
export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// GET /tasks?status=...&page=...
export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  mentee_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;