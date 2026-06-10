import { v4 as uuid } from 'uuid';
import { usersRepo, toPublicUser } from '../../repositories/users.repo.js';
import { teamsRepo } from '../../repositories/teams.repo.js';
import { hashPassword } from '../../lib/crypto.js';
import { ApiError } from '../../lib/http.js';
import { recordActivity } from '../../services/activity.service.js';
import { ENTITY, ACTION } from '../../config/constants.js';

export const usersService = {
    async create(actor, { name, email, password, role, teamId }) {
    if (await usersRepo.getByEmail(email)) {
      throw ApiError.conflict('An account with this email already exists');
    }
    if (teamId && !(await teamsRepo.getById(teamId))) {
      throw ApiError.badRequest('teamId does not reference an existing team');
    }

    const user = {
      userId: uuid(),
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      ...(teamId ? { teamId } : {}),
      createdAt: new Date().toISOString(),
    };
    await usersRepo.create(user);

    await recordActivity({
      actor,
      entityType: ENTITY.USER,
      entityId: user.userId,
      action: ACTION.USER_CREATED,
      metadata: { role, createdBy: actor.id },
    });
    return toPublicUser(user);
  },

  async list() {
    const users = await usersRepo.listAll();
    return users.map(toPublicUser);
  },

  async getById(userId) {
    const user = await usersRepo.getById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async changeRole(actor, userId, role) {
    const user = await usersRepo.getById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const updated = await usersRepo.update(userId, { role });
    await recordActivity({
      actor,
      entityType: ENTITY.USER,
      entityId: userId,
      action: ACTION.USER_ROLE_CHANGED,
      metadata: { from: user.role, to: role },
    });
    return toPublicUser(updated);
  },

  async assignTeam(actor, userId, teamId) {
    const user = await usersRepo.getById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (teamId && !(await teamsRepo.getById(teamId))) {
      throw ApiError.badRequest('teamId does not reference an existing team');
    }
    const updated = await usersRepo.update(userId, { teamId });
    await recordActivity({
      actor,
      entityType: ENTITY.USER,
      entityId: userId,
      action: ACTION.USER_ROLE_CHANGED,
      metadata: { teamId },
    });
    return toPublicUser(updated);
  },
};
