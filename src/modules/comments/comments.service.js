import { v4 as uuid } from 'uuid';
import { commentsRepo } from '../../repositories/comments.repo.js';
import { tasksService } from '../tasks/tasks.service.js';
import { TABLES } from '../../config/tables.js';
import { ENTITY, ACTION } from '../../config/constants.js';
import { transactWithActivity } from '../../services/activity.service.js';
import { decodeCursor, encodeCursor } from '../../lib/pagination.js';

export const commentsService = {
    async add(user, taskId, body) {
    await tasksService.getById(user, taskId);

    const createdAt = new Date().toISOString();
    const commentId = uuid();
    const comment = {
      taskId,
      sk: `${createdAt}#${commentId}`,
      commentId,
      authorId: user.id,
      authorName: user.name || null,
      body,
      createdAt,
    };

    await transactWithActivity(
      [{ Put: { TableName: TABLES.COMMENTS, Item: comment } }],
      {
        actor: user,
        entityType: ENTITY.TASK,
        entityId: taskId,
        action: ACTION.COMMENT_ADDED,
        metadata: { commentId, preview: body.slice(0, 80) },
      }
    );
    return comment;
  },

  async list(user, taskId, { limit, cursor } = {}) {
    await tasksService.getById(user, taskId);
    const { items, lastKey } = await commentsRepo.listByTask(taskId, {
      limit,
      cursor: decodeCursor(cursor),
    });
    return { items, nextCursor: encodeCursor(lastKey) };
  },
};
