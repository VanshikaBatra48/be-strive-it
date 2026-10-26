const taskService = require('../service/taskService');

class TaskController {
  async getAllTasks(req, res) {
    try {
      const filters = req.query;
      const tasks = await taskService.getAllTasks(filters);
      return res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch tasks',
      });
    }
  }

  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      return res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      const status = error.message === 'Task not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createTask(req, res) {
    try {
      const taskData = req.body;
      // If mentor information not passed explicitly, populate from authenticated user
      if (req.user && req.user.role === 'mentor') {
        taskData.mentorName = taskData.mentorName || req.user.name;
        taskData.mentorEmail = taskData.mentorEmail || req.user.email;
      }
      const newTask = await taskService.createTask(taskData);
      return res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: newTask,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create task',
      });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updated = await taskService.updateTask(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: updated,
      });
    } catch (error) {
      const status = error.message === 'Task not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  async submitTask(req, res) {
    try {
      const { id } = req.params;
      const updated = await taskService.submitTask(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Task submitted successfully',
        data: updated,
      });
    } catch (error) {
      const status = error.message === 'Task not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  async evaluateTask(req, res) {
    try {
      const { id } = req.params;
      const updated = await taskService.evaluateTask(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Task evaluated successfully',
        data: updated,
      });
    } catch (error) {
      const status = error.message === 'Task not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      await taskService.deleteTask(id);
      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      const status = error.message === 'Task not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new TaskController();
