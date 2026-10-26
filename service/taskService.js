const { Op } = require('sequelize');
const Task = require('../models/task');

class TaskService {
  /**
   * Get all tasks matching optional filters
   */
  async getAllTasks(filters = {}) {
    const where = {};

    if (filters.menteeEmail) {
      where.menteeEmail = { [Op.iLike]: filters.menteeEmail.trim() };
    }
    if (filters.mentorEmail) {
      where.mentorEmail = { [Op.iLike]: filters.mentorEmail.trim() };
    }
    if (filters.menteeName) {
      where.menteeName = { [Op.iLike]: filters.menteeName.trim() };
    }
    if (filters.mentorName) {
      where.mentorName = { [Op.iLike]: filters.mentorName.trim() };
    }
    if (filters.status && filters.status !== 'All') {
      where.status = { [Op.iLike]: filters.status.trim() };
    }
    if (filters.priority && filters.priority !== 'All') {
      where.priority = { [Op.iLike]: filters.priority.trim() };
    }

    return await Task.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get task by ID
   */
  async getTaskById(id) {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    if (!taskData.title || !taskData.menteeName || !taskData.dueDate) {
      throw new Error('Title, mentee name, and due date are required');
    }

    return await Task.create({
      title: taskData.title.trim(),
      description: taskData.description || '',
      mentorName: taskData.mentorName || '',
      mentorEmail: taskData.mentorEmail || '',
      menteeName: taskData.menteeName.trim(),
      menteeEmail: taskData.menteeEmail || '',
      track: taskData.track || 'Fullstack',
      priority: taskData.priority || 'Medium',
      dueDate: taskData.dueDate,
      status: taskData.status || 'In Progress',
      submissionUrl: taskData.submissionUrl || '',
      demoUrl: taskData.demoUrl || '',
      notes: taskData.notes || '',
    });
  }

  /**
   * Update task
   */
  async updateTask(id, updateData) {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update(updateData);
    return task;
  }

  /**
   * Submit deliverables (Mentee action)
   */
  async submitTask(id, submissionData) {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update({
      submissionUrl: submissionData.repoUrl || submissionData.submissionUrl || task.submissionUrl,
      demoUrl: submissionData.demoUrl || task.demoUrl,
      notes: submissionData.notes || task.notes,
      status: 'Submitted',
    });

    return task;
  }

  /**
   * Evaluate task (Mentor action)
   */
  async evaluateTask(id, evalData) {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.update({
      score: evalData.score !== undefined ? Number(evalData.score) : task.score,
      feedback: evalData.feedback !== undefined ? evalData.feedback : task.feedback,
      mentorFeedback: evalData.feedback !== undefined ? evalData.feedback : task.mentorFeedback,
      status: evalData.status || 'Completed',
    });

    return task;
  }

  /**
   * Delete task
   */
  async deleteTask(id) {
    const task = await Task.findByPk(id);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.destroy();
    return true;
  }
}

module.exports = new TaskService();
