"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const firstLoginCheckMiddleware_1 = require("../middleware/firstLoginCheckMiddleware");
const validate_1 = require("../middleware/validate");
const taskSchema_1 = require("../schemas/taskSchema");
const taskController_1 = require("../controllers/taskController");
const timeLogController_1 = require("../controllers/timeLogController");
const router = (0, express_1.Router)();
// All task routes require authentication and completed first login
router.use(authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin);
// Create a new task (Admin & Mentor only)
router.post('/', (0, authMiddleware_1.authorize)('admin', 'mentor'), (0, validate_1.validate)(taskSchema_1.createTaskSchema), taskController_1.createTaskController);
// Get all tasks (role-scoped)
router.get('/', (0, validate_1.validate)(taskSchema_1.listTasksQuerySchema), taskController_1.getAllTasksController);
// Get a particular task (role-scoped)
router.get('/:id', (0, validate_1.validate)(taskSchema_1.taskIdParamSchema), taskController_1.getTaskByIdController);
// Update a task (Admin & owning Mentor only)
router.patch('/:id', (0, authMiddleware_1.authorize)('admin', 'mentor'), (0, validate_1.validate)(taskSchema_1.updateTaskSchema), taskController_1.updateTaskController);
// Update task status (Assigned Mentee, Admin & owning Mentor)
router.patch('/:id/status', (0, authMiddleware_1.authorize)('admin', 'mentor', 'mentee'), (0, validate_1.validate)(taskSchema_1.updateTaskStatusSchema), taskController_1.updateTaskStatusController);
// Time tracking
router.get('/time/active', (0, authMiddleware_1.authorize)('mentee'), timeLogController_1.getActiveTimerController);
router.post('/:id/time/start', (0, authMiddleware_1.authorize)('mentee'), (0, validate_1.validate)(taskSchema_1.taskIdParamSchema), timeLogController_1.startTimerController);
router.post('/:id/time/stop', (0, authMiddleware_1.authorize)('mentee'), (0, validate_1.validate)(taskSchema_1.taskIdParamSchema), timeLogController_1.stopTimerController);
router.get('/:id/time', (0, authMiddleware_1.authorize)('admin', 'mentor', 'mentee'), (0, validate_1.validate)(taskSchema_1.taskIdParamSchema), timeLogController_1.getTaskTimeController);
// Submit task work (Assigned Mentee only)
router.patch('/:id/submit', (0, authMiddleware_1.authorize)('mentee'), (0, validate_1.validate)(taskSchema_1.submitTaskSchema), taskController_1.submitTaskController);
// Evaluate task submission (Admin & owning Mentor only)
router.patch('/:id/evaluate', (0, authMiddleware_1.authorize)('admin', 'mentor'), (0, validate_1.validate)(taskSchema_1.evaluateTaskSchema), taskController_1.evaluateTaskController);
// Delete a task (Admin & owning Mentor only)
router.delete('/:id', (0, authMiddleware_1.authorize)('admin', 'mentor'), (0, validate_1.validate)(taskSchema_1.taskIdParamSchema), taskController_1.deleteTaskController);
exports.default = router;
//# sourceMappingURL=taskRoutes.js.map