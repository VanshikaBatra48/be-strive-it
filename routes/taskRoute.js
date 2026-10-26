const express = require('express');
const router = express.Router();

const taskController = require('../controller/taskController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkFirstLogin } = require('../middleware/firstLoginCheckMiddleware');

// Get all tasks (supports filters: menteeEmail, mentorEmail, menteeName, mentorName, status, priority)
router.get('/tasks', verifyToken, checkFirstLogin, taskController.getAllTasks);

// Get task by ID
router.get('/tasks/:id', verifyToken, checkFirstLogin, taskController.getTaskById);

// Create task
router.post('/tasks', verifyToken, checkFirstLogin, taskController.createTask);

// Update task
router.patch('/tasks/:id', verifyToken, checkFirstLogin, taskController.updateTask);
router.put('/tasks/:id', verifyToken, checkFirstLogin, taskController.updateTask);

// Submit deliverables (Mentee)
router.patch('/tasks/:id/submit', verifyToken, checkFirstLogin, taskController.submitTask);

// Evaluate task (Mentor)
router.patch('/tasks/:id/evaluate', verifyToken, checkFirstLogin, taskController.evaluateTask);

// Delete task
router.delete('/tasks/:id', verifyToken, checkFirstLogin, taskController.deleteTask);

module.exports = router;
