export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
});

export const PERMISSIONS = Object.freeze({

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
});

const P = PERMISSIONS;

const ADMIN_PERMS = Object.values(P);

const MANAGER_PERMS = [
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
];

const USER_PERMS = [
  P.TEAM_READ,
  P.TASK_READ_OWN,
  P.TASK_UPDATE_OWN,
  P.COMMENT_CREATE,
  P.ACTIVITY_READ_OWN,
  P.DASHBOARD_VIEW,
];

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: new Set(ADMIN_PERMS),
  [ROLES.MANAGER]: new Set(MANAGER_PERMS),
  [ROLES.USER]: new Set(USER_PERMS),
});

export function roleHasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
