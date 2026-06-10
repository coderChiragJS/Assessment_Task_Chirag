import { v4 as uuid } from 'uuid';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES } from '../config/tables.js';
import { activityRepo } from '../repositories/activity.repo.js';

export function buildActivity({ actor, entityType, entityId, action, metadata = {} }) {
  const createdAt = new Date().toISOString();
  const logId = uuid();
  return {
    pk: `${entityType}#${entityId}`,
    sk: `${createdAt}#${logId}`,
    logId,
    actorId: actor.id,
    actorName: actor.name || null,
    entityType,
    entityId,
    action,
    metadata,
    createdAt,
  };
}

// test?

export async function recordActivity(args) {
  return activityRepo.create(buildActivity(args));
}

export async function transactWithActivity(writes, activityArgs) {
  const activityItem = buildActivity(activityArgs);
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        ...writes,
        { Put: { TableName: TABLES.ACTIVITY, Item: activityItem } },
      ],
    })
  );
  return activityItem;
}
