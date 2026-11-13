import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/authMiddleware';
import { checkFirstLogin } from '../middleware/firstLoginCheckMiddleware';
import { validate } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  submitTaskSchema,
  evaluateTaskSchema,
  taskIdParamSchema,
  listTasksQuerySchema,
} from '../schemas/taskSchema';

import {
  createTaskController,
  getAllTasksController,
  getTaskByIdController,
  updateTaskController,
  updateTaskStatusController,
  submitTaskController,
  evaluateTaskController,
  deleteTaskController,
} from '../controllers/taskController';

const router = Router();

// All task routes require authentication and completed first login
router.use(verifyToken, checkFirstLogin);

// Create a new task (Admin & Mentor only)
router.post(
  '/',
  authorize('admin', 'mentor'),
  validate(createTaskSchema),
  createTaskController
);

// Get all tasks (role-scoped)
router.get('/', validate(listTasksQuerySchema), getAllTasksController);

// Get a particular task (role-scoped)
router.get('/:id', validate(taskIdParamSchema), getTaskByIdController);

// Update a task (Admin & owning Mentor only)
router.patch(
  '/:id',
  authorize('admin', 'mentor'),
  validate(updateTaskSchema),
  updateTaskController
);

// Update task status (Assigned Mentee, Admin & owning Mentor)
router.patch(
  '/:id/status',
  authorize('admin', 'mentor', 'mentee'),
  validate(updateTaskStatusSchema),
  updateTaskStatusController
);

// Submit task work (Assigned Mentee only)
router.patch(
  '/:id/submit',
  authorize('mentee'),
  validate(submitTaskSchema),
  submitTaskController
);

// Evaluate task submission (Admin & owning Mentor only)
router.patch(
  '/:id/evaluate',
  authorize('admin', 'mentor'),
  validate(evaluateTaskSchema),
  evaluateTaskController
);

// Delete a task (Admin & owning Mentor only)
router.delete(
  '/:id',
  authorize('admin', 'mentor'),
  validate(taskIdParamSchema),
  deleteTaskController
);

export default router;
