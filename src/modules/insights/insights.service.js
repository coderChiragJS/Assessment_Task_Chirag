import { tasksRepo } from '../../repositories/tasks.repo.js';
import { activityRepo } from '../../repositories/activity.repo.js';
import { ApiError } from '../../lib/http.js';
import { ROLES } from '../../config/rbac.js';
import {
  TASK_STATUS,
  OPEN_STATUSES,
  ACTION,
} from '../../config/constants.js';

const MS_PER_HOUR = 1000 * 60 * 60;
const round1 = (n) => Math.round(n * 10) / 10;

async function teamTasks(teamId) {
  const all = [];
  for (const status of Object.values(TASK_STATUS)) {
    const { items } = await tasksRepo.listByTeam(teamId, { status });
    all.push(...items);
  }
  return all;
}

export const insightsService = {
    async bottlenecks(user, teamIdParam) {
    const teamId =
      user.role === ROLES.ADMIN ? teamIdParam ?? user.teamId : user.teamId;
    if (!teamId) {
      throw ApiError.badRequest(
        'No team in scope: managers must belong to a team, admins may pass ?teamId='
      );
    }

    const tasks = await teamTasks(teamId);

    const acc = {};
    for (const s of Object.values(TASK_STATUS)) acc[s] = { totalMs: 0, samples: 0 };

    for (const task of tasks) {
      const { items } = await activityRepo.listByEntity('TASK', task.taskId, {
        limit: 100,
      });
      for (const entry of items) {
        if (entry.action !== ACTION.TASK_STATUS_CHANGED) continue;
        const from = entry.metadata?.from;
        const ms = entry.metadata?.msInPrevStatus;
        if (from && typeof ms === 'number' && acc[from]) {
          acc[from].totalMs += ms;
          acc[from].samples += 1;
        }
      }
    }

    const now = Date.now();
    let stuck = [];
    for (const task of tasks) {
      if (!OPEN_STATUSES.includes(task.status)) continue;
      const since = task.statusChangedAt || task.createdAt;
      const ms = now - new Date(since).getTime();
      acc[task.status].totalMs += ms;
      acc[task.status].samples += 1;
      stuck.push({
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        assigneeId: task.assigneeId ?? null,
        hoursInStatus: round1(ms / MS_PER_HOUR),
      });
    }

    const stages = Object.values(TASK_STATUS)
      .filter((s) => s !== TASK_STATUS.DONE)
      .map((status) => {
        const { totalMs, samples } = acc[status];
        const avgHours = samples ? totalMs / samples / MS_PER_HOUR : 0;
        return { status, avgHoursInStatus: round1(avgHours), samples };
      });

    const measured = stages.filter((s) => s.samples > 0);
    const bottleneck = measured.reduce(
      (max, s) => (s.avgHoursInStatus > (max?.avgHoursInStatus ?? -1) ? s : max),
      null
    );

    let severity = null;
    if (bottleneck) {
      const others = measured.filter((s) => s.status !== bottleneck.status);
      const otherAvg = others.length
        ? others.reduce((sum, s) => sum + s.avgHoursInStatus, 0) / others.length
        : 0;
      severity = otherAvg > 0 ? round1(bottleneck.avgHoursInStatus / otherAvg) : null;
    }

    const stageAvg = Object.fromEntries(stages.map((s) => [s.status, s.avgHoursInStatus]));
    stuck = stuck
      .filter((t) => t.hoursInStatus >= (stageAvg[t.status] || 0) && t.hoursInStatus > 0)
      .sort((a, b) => b.hoursInStatus - a.hoursInStatus)
      .slice(0, 10);

    return {
      teamId,
      stages,
      bottleneck: bottleneck
        ? {
            status: bottleneck.status,
            avgHoursInStatus: bottleneck.avgHoursInStatus,
            severityVsOthers: severity,
            insight: severity
              ? `${bottleneck.status} is the slowest stage, about ${severity}x longer on average than the others.`
              : `${bottleneck.status} is currently the slowest stage.`,
          }
        : { status: null, insight: 'Not enough workflow history yet to detect a bottleneck.' },
      stuckTasks: stuck,
    };
  },
};
