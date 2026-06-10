export const TASK_STATUS = Object.freeze({
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
});

export const STATUS_TRANSITIONS = Object.freeze({
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED', 'TODO'],
  IN_REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
  DONE: ['TODO'],
});

export const OPEN_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'];

export const canTransition = (from, to) => (STATUS_TRANSITIONS[from] || []).includes(to);

export const TASK_PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const PRIORITY_WEIGHT = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 5,
});

export const ENTITY = Object.freeze({
  TASK: 'TASK',
  USER: 'USER',
  TEAM: 'TEAM',
});

export const ACTION = Object.freeze({
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_DELETED: 'TASK_DELETED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  USER_CREATED: 'USER_CREATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  TEAM_CREATED: 'TEAM_CREATED',
});
