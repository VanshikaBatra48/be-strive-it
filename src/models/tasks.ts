import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type User from './user';

export type TaskCategory = 'upskill' | 'research' | 'client-project' | 'inhouse-project';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'in-progress' | 'submitted' | 'needs-revision' | 'complete' | 'hold' | 'blocker';

class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string;
  declare category: CreationOptional<TaskCategory>;
  declare priority: CreationOptional<TaskPriority>;
  declare start_date: Date;
  declare due_date: Date;
  declare estimated_hours: CreationOptional<number | null>;
  declare mentee_id: number;
  declare assigned_by: number;
  declare status: CreationOptional<TaskStatus>;
  declare submission_url: CreationOptional<string | null>;
  declare demo_url: CreationOptional<string | null>;
  declare submission_notes: CreationOptional<string | null>;
  declare submitted_at: CreationOptional<Date | null>;
  declare score: CreationOptional<number | null>;
  declare feedback: CreationOptional<string | null>;
  declare evaluated_by: CreationOptional<number | null>;
  declare evaluated_at: CreationOptional<Date | null>;
  declare due_reminder_24h_sent: CreationOptional<boolean>;
  declare due_reminder_1h_sent: CreationOptional<boolean>;
  declare actual_seconds: CreationOptional<number>;


  // Associations
  declare mentee?: NonAttribute<User | null>;
  declare assigner?: NonAttribute<User | null>;
  declare evaluator?: NonAttribute<User | null>;

  // Managed by Sequelize (timestamps + paranoid)
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Task.init(
  {
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
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('upskill', 'research', 'client-project', 'inhouse-project'),
      allowNull: false,
      defaultValue: 'upskill',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estimated_hours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mentee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('in-progress', 'submitted', 'needs-revision', 'complete', 'hold', 'blocker'),
      allowNull: false,
      defaultValue: 'in-progress',
    },
    submission_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    demo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    submission_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actual_seconds: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evaluated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    evaluated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    due_reminder_24h_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
    due_reminder_1h_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'tasks',
    modelName: 'Task',
    timestamps: true,
    underscored: true,
    paranoid: true,
  }
);

export default Task;
export type TaskAttributes = InferAttributes<Task>;
