import cron from 'node-cron';
import { Op } from 'sequelize';
import Task from '../models/tasks';
import { safeNotify, notifyTaskDueDate } from '../service/notificationService';

export function startDueDateJob(): void {
  // every day at 09:00 server time
  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const tasks = await Task.findAll({
        where: {
          due_date: { [Op.between]: [now, in24h] },
          status: { [Op.notIn]: ['submitted', 'complete', 'hold'] },
          due_reminder_sent: false,
        },
      });

      for (const task of tasks) {
        await safeNotify(async () => {
          await notifyTaskDueDate(task.mentee_id, task, task.due_date);
          await task.update({ due_reminder_sent: true });
        });
      }
    } catch (err) {
      console.error('Due date job failed:', err);
    }
  });
}