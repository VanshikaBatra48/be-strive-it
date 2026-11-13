import type { Transaction } from 'sequelize';
import { Notification } from '../models/notification';
import type { NotificationType } from '../models/notification';
import { getIO } from '../socket';

/* ---------- Who receives what ---------- */
export const MENTEE_TYPES: NotificationType[] = [
  'TASK_ASSIGNED',
  'TASK_DUE_DATE',
  'TASK_CHANGE_REQUEST',
  'EVALUATION_SUBMITTED',
];

export const MENTOR_TYPES: NotificationType[] = [
  'TASK_UPDATED',
  'TASK_SUBMITTED',
  'TASK_STATUS_CHANGED',
];

/* ---------- Core ---------- */
export interface NewNotification {
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface TaskRef {
  id: number;
  title: string;
}

export async function createNotification(
  input: NewNotification,
  options: { transaction?: Transaction } = {}
) {
  const { transaction } = options;

  const notification = await Notification.create(
    { ...input, data: input.data ?? {} },
    { transaction }
  );

  const emit = () => {
    try {
      getIO()
        .to(`user:${input.user_id}`)
        .emit('notification:new', notification.toJSON());
    } catch (err) {
      // A failed push must never break the main request
      console.error('Socket emit failed:', err);
    }
  };

  // Inside a transaction, push only after it commits
  if (transaction) transaction.afterCommit(emit);
  else emit();

  return notification;
}

/** Run a notification without letting its failure break the caller. */
export async function safeNotify(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error('Notification failed:', err);
  }
}

/* ---------- Mentee notifications ---------- */
export const notifyTaskAssigned = (
  mentee_id: number,
  task: TaskRef,
  assignerName: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: `${assignerName} assigned you "${task.title}"`,
      data: { taskId: task.id },
    },
    { transaction: tx }
  );

export const notifyTaskDueDate = (
  mentee_id: number,
  task: TaskRef,
  dueDate: Date,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: 'TASK_DUE_DATE',
      title: 'Task due soon',
      message: `"${task.title}" is due on ${new Date(dueDate).toDateString()}`,
      data: { taskId: task.id, dueDate: new Date(dueDate).toISOString() },
    },
    { transaction: tx }
  );

export const notifyTaskChangeRequest = (
  mentee_id: number,
  task: TaskRef,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: 'TASK_CHANGE_REQUEST',
      title: 'Changes requested',
      message: `Your mentor requested changes on "${task.title}"`,
      data: { taskId: task.id },
    },
    { transaction: tx }
  );

export const notifyEvaluationSubmitted = (
  mentee_id: number,
  task: TaskRef,
  score: number | null,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: 'EVALUATION_SUBMITTED',
      title: 'Task evaluated',
      message:
        score !== null
          ? `Your task "${task.title}" was evaluated. Score: ${score}/100`
          : `Your task "${task.title}" was evaluated`,
      data: { taskId: task.id, score },
    },
    { transaction: tx }
  );

/* ---------- Mentor notifications ---------- */
export const notifyTaskUpdated = (
  mentor_id: number,
  task: TaskRef,
  actorName: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentor_id,
      type: 'TASK_UPDATED',
      title: 'Task updated',
      message: `${actorName} updated "${task.title}"`,
      data: { taskId: task.id },
    },
    { transaction: tx }
  );

export const notifyTaskSubmitted = (
  mentor_id: number,
  task: TaskRef,
  menteeName: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentor_id,
      type: 'TASK_SUBMITTED',
      title: 'Task submitted',
      message: `${menteeName} submitted "${task.title}" for review`,
      data: { taskId: task.id },
    },
    { transaction: tx }
  );

export const notifyTaskStatusChanged = (
  mentor_id: number,
  task: TaskRef,
  menteeName: string,
  status: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentor_id,
      type: 'TASK_STATUS_CHANGED',
      title: 'Task status changed',
      message: `${menteeName} moved "${task.title}" to ${status}`,
      data: { taskId: task.id, status },
    },
    { transaction: tx }
  );

/* ---------- Read side (used by the controller) ---------- */
export const listNotifications = (user_id: number, limit: number, offset: number) =>
  Notification.findAll({
    where: { user_id },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

export const getUnreadCount = (user_id: number) =>
  Notification.count({ where: { user_id, is_read: false } });

export async function markRead(user_id: number, id: number) {
  const [affected] = await Notification.update(
    { is_read: true },
    { where: { id, user_id } }
  );
  return affected;
}

export async function markAllRead(user_id: number) {
  const [affected] = await Notification.update(
    { is_read: true },
    { where: { user_id, is_read: false } }
  );
  return affected;
}