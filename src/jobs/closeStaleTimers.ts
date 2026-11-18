import cron from 'node-cron';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import TaskTimeLog from '../models/taskTimeLog';
import { closeLog } from '../service/timeLogService';

const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

export function startStaleTimerJob() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - MAX_SESSION_MS);
      const stale = await TaskTimeLog.findAll({
        where: { ended_at: null, started_at: { [Op.lt]: cutoff } },
      });

      for (const log of stale) {
        await sequelize.transaction((t) =>
          closeLog(log, t, {
            endedAt: new Date(log.started_at.getTime() + MAX_SESSION_MS),
            autoClosed: true,
          })
        );
      }
    } catch (e) {
      console.error('Stale timer job failed', e);
    }
  });
}