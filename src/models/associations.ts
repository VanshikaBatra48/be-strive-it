import User from './user';
import Task from './tasks';
import PasswordReset from './resetPassword';

let initialized = false;

/** Register Sequelize model associations once across the application. */
export function initAssociations(): void {
  if (initialized) return;

  User.belongsTo(User, { as: 'mentor', foreignKey: 'mentor_id' });
  User.hasMany(User, { as: 'mentees', foreignKey: 'mentor_id' });

  User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'mentee_id' });
  User.hasMany(Task, { as: 'createdTasks', foreignKey: 'assigned_by' });
  User.hasMany(Task, { as: 'evaluatedTasks', foreignKey: 'evaluated_by' });

  Task.belongsTo(User, { as: 'mentee', foreignKey: 'mentee_id' });
  Task.belongsTo(User, { as: 'assigner', foreignKey: 'assigned_by' });
  Task.belongsTo(User, { as: 'evaluator', foreignKey: 'evaluated_by' });

  User.hasMany(PasswordReset, { as: 'passwordResets', foreignKey: 'userId' });
  PasswordReset.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  initialized = true;
}

export default initAssociations;

