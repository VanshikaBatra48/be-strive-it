import type { Transaction } from "sequelize";
import { Notification } from "../models/notification";
import type { NotificationType } from "../models/notification";
import { getIO } from "../socket";

/* ---------- Who receives what (documentation + runtime guard) ---------- */
export const MENTEE_TYPES: NotificationType[] = [
  "TASK_ASSIGNED",
  "TASK_DUE_DATE",
  "TASK_CHANGE_REQUEST",
  "EVALUATION_SUBMITTED",
];

export const MENTOR_TYPES: NotificationType[] = [
  "TASK_UPDATED",
  "TASK_SUBMITTED",
  "TASK_STATUS_CHANGED",
];

/* ---------- Core ---------- */
export interface NewNotification {
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
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
        .emit("notification:new", notification.toJSON());
    } catch (err) {
      // A failed push must never break the main request
      console.error("Socket emit failed:", err);
    }
  };

  // If inside a transaction, only push after it commits
  if (transaction) transaction.afterCommit(emit);
  else emit();

  return notification;
}

/* ---------- Mentee notifications ---------- */
interface TaskRef {
  id: number;
  title: string;
}

export const notifyTaskAssigned = (
  mentee_id: number,
  task: TaskRef,
  mentorName: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `${mentorName} assigned you "${task.title}"`,
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
      type: "TASK_DUE_DATE",
      title: "Task due soon",
      message: `"${task.title}" is due on ${dueDate.toDateString()}`,
      data: { taskId: task.id, dueDate: dueDate.toISOString() },
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
      type: "TASK_CHANGE_REQUEST",
      title: "Changes requested",
      message: `Your mentor requested changes on "${task.title}"`,
      data: { taskId: task.id },
    },
    { transaction: tx }
  );

export const notifyEvaluationSubmitted = (
  mentee_id: number,
  evaluationId: number,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentee_id,
      type: "EVALUATION_SUBMITTED",
      title: "New evaluation",
      message: "Your mentor submitted an evaluation for you",
      data: { evaluationId },
    },
    { transaction: tx }
  );

/* ---------- Mentor notifications ---------- */
export const notifyTaskUpdated = (
  mentor_id: number,
  task: TaskRef,
  menteeName: string,
  tx?: Transaction
) =>
  createNotification(
    {
      user_id: mentor_id,
      type: "TASK_UPDATED",
      title: "Task updated",
      message: `${menteeName} updated "${task.title}"`,
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
      type: "TASK_SUBMITTED",
      title: "Task submitted",
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
      type: "TASK_STATUS_CHANGED",
      title: "Task status changed",
      message: `${menteeName} moved "${task.title}" to ${status}`,
      data: { taskId: task.id, status },
    },
    { transaction: tx }
  );

/* ---------- Read side (used by the controller) ---------- */
export const listNotifications = (user_id: number, limit: number, offset: number) =>
  Notification.findAll({
    where: { user_id },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

export const getUnreadCount = (user_id: number) =>
  Notification.count({ where: { user_id, is_read: false } });

export async function markRead(user_id: number, id: number) {
  const [affected] = await Notification.update(
    { is_read: true },
    { where: { id, user_id } } // user_id check stops access to other users' rows
  );
  return affected; // 0 means not found or not yours
}

export async function markAllRead(user_id: number) {
  const [affected] = await Notification.update(
    { is_read: true },
    { where: { user_id, is_read: false } }
  );
  return affected;
}