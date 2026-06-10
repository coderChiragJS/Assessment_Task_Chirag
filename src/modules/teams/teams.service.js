import { v4 as uuid } from 'uuid';
import { teamsRepo } from '../../repositories/teams.repo.js';
import { usersRepo, toPublicUser } from '../../repositories/users.repo.js';
import { ApiError } from '../../lib/http.js';
import { recordActivity } from '../../services/activity.service.js';
import { ENTITY, ACTION } from '../../config/constants.js';
import { ROLES } from '../../config/rbac.js';

export const teamsService = {
    async create(actor, { name, managerId }) {
    if (managerId) {
      const manager = await usersRepo.getById(managerId);
      if (!manager) throw ApiError.badRequest('managerId does not reference a user');
      if (manager.role !== ROLES.MANAGER && manager.role !== ROLES.ADMIN) {
        throw ApiError.badRequest('Assigned manager must have MANAGER or ADMIN role');
      }
    }

    const team = { teamId: uuid(), name, managerId: managerId ?? null, createdAt: new Date().toISOString() };
    await teamsRepo.create(team);

    if (managerId) await usersRepo.update(managerId, { teamId: team.teamId });

    await recordActivity({
      actor,
      entityType: ENTITY.TEAM,
      entityId: team.teamId,
      action: ACTION.TEAM_CREATED,
      metadata: { name, managerId: managerId ?? null },
    });
    return team;
  },

  async list() {
    return teamsRepo.listAll();
  },

    async getWithMembers(teamId) {
    const team = await teamsRepo.getById(teamId);
    if (!team) throw ApiError.notFound('Team not found');
    const members = await usersRepo.listByTeam(teamId);
    return { ...team, members: members.map(toPublicUser) };
  },
};
