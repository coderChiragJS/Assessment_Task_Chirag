import { v4 as uuid } from 'uuid';
import { tasksRepo } from '../../repositories/tasks.repo.js';
import { usersRepo } from '../../repositories/users.repo.js';
import { ApiError } from '../../lib/http.js';
import {
  TASK_STATUS,
  STATUS_TRANSITIONS,
  canTransition,
  ENTITY,
  ACTION,
} from '../../config/constants.js';
import { TABLES } from '../../config/tables.js';
import { ROLES } from '../../config/rbac.js';
import {
  recordActivity,
  transactWithActivity,
} from '../../services/activity.service.js';

const MAX_SCOPED_TASKS = 1000;

async function collectAll(fetchPage) {
  const out = [];
  let cursor;
  do {
    const { items, lastKey } = await fetchPage(cursor);
    out.push(...items);
    cursor = lastKey;
  } while (cursor && out.length < MAX_SCOPED_TASKS);
  return out;
}

function canView(user, task) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.MANAGER) return task.teamId === user.teamId;
  return task.assigneeId === user.id || task.creatorId === user.id;
}

function canManage(user, task) {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.MANAGER) return task.teamId === user.teamId;
  return false;
}

async function loadOrThrow(taskId) {
  const task = await tasksRepo.getById(taskId);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

async function assertAssigneeInTeam(assigneeId, teamId) {
  const assignee = await usersRepo.getById(assigneeId);
  if (!assignee) throw ApiError.badRequest('Assignee does not exist');
  if (assignee.teamId !== teamId) {
    throw ApiError.badRequest('Assignee must belong to the same team as the task');
  }
  return assignee;
}

export const tasksService = {
  async create(actor, input) {

    const teamId =
      actor.role === ROLES.ADMIN ? input.teamId ?? actor.teamId : actor.teamId;
    if (!teamId) {
      throw ApiError.badRequest(
        'You must belong to a team (admins may pass teamId) to create a task'
      );
    }

    let assigneeId = input.assigneeId ?? null;
    if (assigneeId) await assertAssigneeInTeam(assigneeId, teamId);

    const now = new Date().toISOString();
    const task = {
      taskId: uuid(),
      title: input.title,
      description: input.description ?? '',
      status: TASK_STATUS.TODO,
      priority: input.priority,
      teamId,
      creatorId: actor.id,
      ...(assigneeId ? { assigneeId } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
    };

    await transactWithActivity(
      [
        {
          Put: {
            TableName: TABLES.TASKS,
            Item: task,
            ConditionExpression: 'attribute_not_exists(taskId)',
          },
        },
      ],
      {
        actor,
        entityType: ENTITY.TASK,
        entityId: task.taskId,
        action: ACTION.TASK_CREATED,
        metadata: { title: task.title, assigneeId, priority: task.priority },
      }
    );
    return task;
  },

  async getById(user, taskId) {
    const task = await loadOrThrow(taskId);
    if (!canView(user, task)) throw ApiError.forbidden('You cannot view this task');
    return task;
  },

  async scopedTasks(user, { status, assigneeId, teamId }) {
    if (assigneeId) {
      if (user.role === ROLES.USER && assigneeId !== user.id) {
        throw ApiError.forbidden('You can only view your own tasks');
      }
      return collectAll((cursor) => tasksRepo.listByAssignee(assigneeId, { status, cursor }));
    }
    if (user.role === ROLES.ADMIN) {
      return teamId
        ? collectAll((cursor) => tasksRepo.listByTeam(teamId, { status, cursor }))
        : collectAll((cursor) => tasksRepo.listAll({ cursor }));
    }
    if (user.role === ROLES.MANAGER) {
      return user.teamId
        ? collectAll((cursor) => tasksRepo.listByTeam(user.teamId, { status, cursor }))
        : [];
    }
    const [assigned, createdBy] = await Promise.all([
      collectAll((cursor) => tasksRepo.listByAssignee(user.id, { status, cursor })),
      collectAll((cursor) => tasksRepo.listByCreator(user.id, { cursor })),
    ]);
    const byId = new Map();
    [...assigned, ...createdBy].forEach((t) => byId.set(t.taskId, t));
    return [...byId.values()];
  },

  async list(user, query) {
    const { status, priority, assigneeId, teamId, q } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let items = await this.scopedTasks(user, { status, assigneeId, teamId });

    if (status) items = items.filter((t) => t.status === status);
    if (priority) items = items.filter((t) => t.priority === priority);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(needle) ||
          (t.description || '').toLowerCase().includes(needle)
      );
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = items.length;
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);

    return {
      items: pageItems,
      meta: { total, page, limit, returned: pageItems.length, hasMore: start + limit < total },
    };
  },

  async update(user, taskId, patch) {
    const task = await loadOrThrow(taskId);
    if (!canManage(user, task)) {
      throw ApiError.forbidden('Only a manager or admin can edit task details');
    }
    const updated = await tasksRepo.update(taskId, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    await recordActivity({
      actor: user,
      entityType: ENTITY.TASK,
      entityId: taskId,
      action: ACTION.TASK_UPDATED,
      metadata: { fields: Object.keys(patch) },
    });
    return updated;
  },

  async assign(user, taskId, assigneeId) {
    const task = await loadOrThrow(taskId);
    if (!canManage(user, task)) {
      throw ApiError.forbidden('Only a manager or admin can assign tasks');
    }
    await assertAssigneeInTeam(assigneeId, task.teamId);

    await transactWithActivity(
      [
        {
          Update: {
            TableName: TABLES.TASKS,
            Key: { taskId },
            UpdateExpression: 'SET assigneeId = :a, updatedAt = :u',
            ExpressionAttributeValues: {
              ':a': assigneeId,
              ':u': new Date().toISOString(),
            },
            ConditionExpression: 'attribute_exists(taskId)',
          },
        },
      ],
      {
        actor: user,
        entityType: ENTITY.TASK,
        entityId: taskId,
        action: ACTION.TASK_ASSIGNED,
        metadata: { from: task.assigneeId, to: assigneeId },
      }
    );
    return { ...task, assigneeId };
  },

  async changeStatus(user, taskId, nextStatus) {
    const task = await loadOrThrow(taskId);

    const isOwnAssigned = task.assigneeId === user.id;
    if (!canManage(user, task) && !isOwnAssigned) {
      throw ApiError.forbidden('You cannot change the status of this task');
    }

    if (task.status === nextStatus) {
      throw ApiError.badRequest(`Task is already ${nextStatus}`);
    }
    if (!canTransition(task.status, nextStatus)) {
      throw ApiError.unprocessable(`Invalid transition ${task.status} to ${nextStatus}`, {
        allowed: STATUS_TRANSITIONS[task.status] || [],
      });
    }

    const now = new Date().toISOString();
    await transactWithActivity(
      [
        {
          Update: {
            TableName: TABLES.TASKS,
            Key: { taskId },
            UpdateExpression:
              'SET #s = :s, statusChangedAt = :c, updatedAt = :c',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':s': nextStatus, ':c': now },
            ConditionExpression: 'attribute_exists(taskId)',
          },
        },
      ],
      {
        actor: user,
        entityType: ENTITY.TASK,
        entityId: taskId,
        action: ACTION.TASK_STATUS_CHANGED,
        metadata: {
          from: task.status,
          to: nextStatus,

          msInPrevStatus: task.statusChangedAt
            ? new Date(now) - new Date(task.statusChangedAt)
            : null,
        },
      }
    );
    return { ...task, status: nextStatus, statusChangedAt: now };
  },

  async remove(user, taskId) {
    const task = await loadOrThrow(taskId);
    if (!canManage(user, task)) {
      throw ApiError.forbidden('Only a manager or admin can delete tasks');
    }
    await tasksRepo.remove(taskId);
    await recordActivity({
      actor: user,
      entityType: ENTITY.TASK,
      entityId: taskId,
      action: ACTION.TASK_DELETED,
      metadata: { title: task.title },
    });
    return { deleted: true, taskId };
  },
};
