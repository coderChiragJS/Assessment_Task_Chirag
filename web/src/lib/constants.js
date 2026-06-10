export const ROLES = { ADMIN: 'ADMIN', MANAGER: 'MANAGER', USER: 'USER' };

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

export const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

export const STATUS_TRANSITIONS = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED', 'TODO'],
  IN_REVIEW: ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['TODO', 'IN_PROGRESS'],
  DONE: ['TODO'],
};

export const OPEN_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'];

export const TASK_PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' };
export const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const PERMISSIONS = {
  USER_MANAGE: 'user:manage',
  USER_READ_ALL: 'user:read:all',
  TEAM_MANAGE: 'team:manage',
  TEAM_READ: 'team:read',
  TASK_CREATE: 'task:create',
  TASK_ASSIGN: 'task:assign',
  TASK_READ_ALL: 'task:read:all',
  TASK_READ_TEAM: 'task:read:team',
  TASK_READ_OWN: 'task:read:own',
  TASK_UPDATE_ANY: 'task:update:any',
  TASK_UPDATE_OWN: 'task:update:own',
  TASK_DELETE: 'task:delete',
  COMMENT_CREATE: 'comment:create',
  ACTIVITY_READ_ALL: 'activity:read:all',
  ACTIVITY_READ_TEAM: 'activity:read:team',
  ACTIVITY_READ_OWN: 'activity:read:own',
  DASHBOARD_VIEW: 'dashboard:view',
};

export const PERMS = PERMISSIONS;

const P = PERMISSIONS;

const ROLE_PERMISSIONS = {
  ADMIN: Object.values(P),
  MANAGER: [
    P.USER_READ_ALL,
    P.TEAM_READ,
    P.TASK_CREATE,
    P.TASK_ASSIGN,
    P.TASK_READ_TEAM,
    P.TASK_READ_OWN,
    P.TASK_UPDATE_ANY,
    P.TASK_DELETE,
    P.COMMENT_CREATE,
    P.ACTIVITY_READ_TEAM,
    P.ACTIVITY_READ_OWN,
    P.DASHBOARD_VIEW,
  ],
  USER: [
    P.TEAM_READ,
    P.TASK_READ_OWN,
    P.TASK_UPDATE_OWN,
    P.COMMENT_CREATE,
    P.ACTIVITY_READ_OWN,
    P.DASHBOARD_VIEW,
  ],
};

export function can(role, permission) {
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes(permission);
}

export function canAny(role, ...permissions) {
  return permissions.some((p) => can(role, p));
}
