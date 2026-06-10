import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES } from '../config/tables.js';

export const commentsRepo = {
    async create(comment) {
    await ddb.send(new PutCommand({ TableName: TABLES.COMMENTS, Item: comment }));
    return comment;
  },

  async listByTask(taskId, { limit, cursor } = {}) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.COMMENTS,
        KeyConditionExpression: 'taskId = :t',
        ExpressionAttributeValues: { ':t': taskId },
        ScanIndexForward: true,
        ...(limit ? { Limit: limit } : {}),
        ...(cursor ? { ExclusiveStartKey: cursor } : {}),
      })
    );
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },
};
