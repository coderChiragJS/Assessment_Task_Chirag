import { tasksRepo } from '../../repositories/tasks.repo.js';
import { usersRepo, toPublicUser } from '../../repositories/users.repo.js';
import { teamsRepo } from '../../repositories/teams.repo.js';
import { activityRepo } from '../../repositories/activity.repo.js';
import { ROLES } from '../../config/rbac.js';
import {
  TASK_STATUS,
  OPEN_STATUSES,
  PRIORITY_WEIGHT,
} from '../../config/constants.js';
import { ApiError } from '../../lib/http.js';

function emptyStatusCounts() {
  return Object.values(TASK_STATUS).reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
}

function summarize(tasks) {
  const byStatus = emptyStatusCounts();
  const now = Date.now();
  let overdue = 0;
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (t.dueDate && t.status !== TASK_STATUS.DONE && new Date(t.dueDate).getTime() < now) {
      overdue += 1;
    }
  }
  return { total: tasks.length, byStatus, overdue };
}

function workloadScore(tasks) {
  return tasks
    .filter((t) => OPEN_STATUSES.includes(t.status))
    .reduce((sum, t) => sum + (PRIORITY_WEIGHT[t.priority] || 1), 0);
}

async function allTeamTasks(teamId) {
  const collected = [];
  for (const status of Object.values(TASK_STATUS)) {
    const { items } = await tasksRepo.listByTeam(teamId, { status });
    collected.push(...items);
  }
  return collected;
}

export const dashboardService = {
  async forUser(user) {
    if (user.role === ROLES.ADMIN) return this.admin(user);
    if (user.role === ROLES.MANAGER) return this.manager(user);
    return this.member(user);
  },

    async admin() {
    const [{ items: tasks }, users, teams] = await Promise.all([
      tasksRepo.listAll({ limit: 1000 }),
      usersRepo.listAll(),
      teamsRepo.listAll(),
    ]);
    return {
      scope: 'ADMIN',
      tasks: summarize(tasks),
      totals: { users: users.length, teams: teams.length, tasks: tasks.length },
    };
  },

    async manager(user) {
    if (!user.teamId) throw ApiError.badRequest('Manager is not assigned to a team');
    const [tasks, members] = await Promise.all([
      allTeamTasks(user.teamId),
      usersRepo.listByTeam(user.teamId),
    ]);

    const byAssignee = new Map();
    for (const t of tasks) {
      if (!t.assigneeId) continue;
      const arr = byAssignee.get(t.assigneeId) || [];
      arr.push(t);
      byAssignee.set(t.assigneeId, arr);
    }

    const workload = members.map((m) => {
      const memberTasks = byAssignee.get(m.userId) || [];
      return {
        user: toPublicUser(m),
        openTasks: memberTasks.filter((t) => OPEN_STATUSES.includes(t.status)).length,
        workloadScore: workloadScore(memberTasks),
      };
    });
    workload.sort((a, b) => b.workloadScore - a.workloadScore);

    return {
      scope: 'MANAGER',
      teamId: user.teamId,
      tasks: summarize(tasks),
      workload,
    };
  },

    async member(user) {
    const assigned = await tasksRepo.listOpenByAssignee(user.id);
    const { items: recentActivity } = await activityRepo.listByActor(user.id, {
      limit: 10,
    });
    return {
      scope: 'USER',
      tasks: summarize(assigned),
      recentActivity,
    };
  },
};
