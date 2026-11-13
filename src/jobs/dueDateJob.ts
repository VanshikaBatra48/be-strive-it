import cron from 'node-cron';
import { Op } from 'sequelize';
import Task from '../models/tasks';
import { safeNotify, notifyTaskDueDate } from '../service/notificationService';

const HOUR = 60 * 60 * 1000;
const FINISHED_STATUSES = ['submitted', 'complete', 'hold'];

let running = false; // stops two runs from overlapping

async function sendDueReminders(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const in1h = new Date(now.getTime() + HOUR);
    const in24h = new Date(now.getTime() + 24 * HOUR);

    // 1) Tasks due within the next hour -> "1 hour" reminder
    const dueSoon = await Task.findAll({
      where: {
        due_date: { [Op.gt]: now, [Op.lte]: in1h },
        status: { [Op.notIn]: FINISHED_STATUSES },
        due_reminder_1h_sent: false,
      },
    });

    for (const task of dueSoon) {
      await safeNotify(async () => {
        await notifyTaskDueDate(task.mentee_id, task, task.due_date, '1h');
        // also close the 24h reminder, so the mentee never gets both at once
        await task.update({ due_reminder_1h_sent: true, due_reminder_24h_sent: true });
      });
    }

    // 2) Tasks due between 1 and 24 hours from now -> "24 hours" reminder
    const dueTomorrow = await Task.findAll({
      where: {
        due_date: { [Op.gt]: in1h, [Op.lte]: in24h },
        status: { [Op.notIn]: FINISHED_STATUSES },
        due_reminder_24h_sent: false,
      },
    });

    for (const task of dueTomorrow) {
      await safeNotify(async () => {
        await notifyTaskDueDate(task.mentee_id, task, task.due_date, '24h');
        await task.update({ due_reminder_24h_sent: true });
      });
    }
  } catch (err) {
    console.error('Due date job failed:', err);
  } finally {
    running = false;
  }
}

export function startDueDateJob(): void {
  // every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    void sendDueReminders();
  }, { timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata' });

  // also run once at startup, to catch anything missed while the server was down
  void sendDueReminders();
}