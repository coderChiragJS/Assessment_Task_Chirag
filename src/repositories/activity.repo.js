import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES, INDEXES } from '../config/tables.js';

export const activityRepo = {
  async create(entry) {
    await ddb.send(new PutCommand({ TableName: TABLES.ACTIVITY, Item: entry }));
    return entry;
  },

  async listByEntity(entityType, entityId, { limit = 50, cursor } = {}) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.ACTIVITY,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `${entityType}#${entityId}` },
        ScanIndexForward: false,
        Limit: limit,
        ...(cursor ? { ExclusiveStartKey: cursor } : {}),
      })
    );
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },

  async listByActor(actorId, { limit = 50, cursor } = {}) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.ACTIVITY,
        IndexName: INDEXES.ACTIVITY_BY_ACTOR,
        KeyConditionExpression: 'actorId = :a',
        ExpressionAttributeValues: { ':a': actorId },
        ScanIndexForward: false,
        Limit: limit,
        ...(cursor ? { ExclusiveStartKey: cursor } : {}),
      })
    );
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },
};
