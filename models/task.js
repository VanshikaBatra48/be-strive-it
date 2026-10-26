const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mentorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mentorEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  menteeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  menteeEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  track: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Fullstack',
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'Medium',
  },
  dueDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'In Progress',
  },
  submissionUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  demoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mentorFeedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tasks',
  timestamps: true,
});

module.exports = Task;
