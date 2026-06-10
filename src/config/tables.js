import { env } from './env.js';

const p = env.TABLE_PREFIX;

export const TABLES = {
  USERS: `${p}Users`,
  TEAMS: `${p}Teams`,
  TASKS: `${p}Tasks`,
  COMMENTS: `${p}Comments`,
  ACTIVITY: `${p}ActivityLog`,
  REFRESH_TOKENS: `${p}RefreshTokens`,
};

export const INDEXES = {
  USERS_BY_EMAIL: 'EmailIndex',
  USERS_BY_TEAM: 'TeamIndex',
  TASKS_BY_ASSIGNEE: 'AssigneeIndex',
  TASKS_BY_TEAM_STATUS: 'TeamStatusIndex',
  TASKS_BY_CREATOR: 'CreatorIndex',
  ACTIVITY_BY_ACTOR: 'ActorIndex',
};
