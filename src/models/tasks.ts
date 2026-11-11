import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database';

export type TaskCategory = 'upskill' | 'research' | 'client-project' | 'inhouse-project';
export type TaskStatus = 'in-progress' | 'complete' | 'hold';

class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string;
  declare category: CreationOptional<TaskCategory>;
  declare start_date: Date;
  declare due_date: Date;
  declare estimated_hours: number;
  declare mentee_id: number;
  declare assigned_by: number;
  declare status: CreationOptional<TaskStatus>;

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
      allowNull: false,
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
      type: DataTypes.ENUM('in-progress', 'complete', 'hold'),
      allowNull: false,
      defaultValue: 'in-progress',
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
    underscored: true, // createdAt -> created_at, updatedAt -> updated_at
    paranoid: true,    // deletedAt -> deleted_at, enables soft delete
  }
);

export default Task;
export type TaskAttributes = InferAttributes<Task>;