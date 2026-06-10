import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES, INDEXES } from '../config/tables.js';

export function toPublicUser(user) {
  if (!user) return user;
  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
}

export const usersRepo = {
  async create(user) {
    await ddb.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: user,
        ConditionExpression: 'attribute_not_exists(userId)',
      })
    );
    return user;
  },

  async getById(userId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { userId } })
    );
    return Item || null;
  },

  async getByEmail(email) {
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: INDEXES.USERS_BY_EMAIL,
        KeyConditionExpression: 'email = :e',
        ExpressionAttributeValues: { ':e': email.toLowerCase() },
        Limit: 1,
      })
    );
    return Items?.[0] || null;
  },

  async listByTeam(teamId) {
    const { Items } = await ddb.send(
      new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: INDEXES.USERS_BY_TEAM,
        KeyConditionExpression: 'teamId = :t',
        ExpressionAttributeValues: { ':t': teamId },
      })
    );
    return Items || [];
  },

    async listAll() {
    const { Items } = await ddb.send(new ScanCommand({ TableName: TABLES.USERS }));
    return Items || [];
  },

  async update(userId, attrs) {
    const names = {};
    const values = {};
    const sets = [];
    const removes = [];
    for (const [k, v] of Object.entries(attrs)) {
      names[`#${k}`] = k;
      if (v === null || v === undefined) {
        removes.push(`#${k}`);
      } else {
        values[`:${k}`] = v;
        sets.push(`#${k} = :${k}`);
      }
    }
    const clauses = [];
    if (sets.length) clauses.push(`SET ${sets.join(', ')}`);
    if (removes.length) clauses.push(`REMOVE ${removes.join(', ')}`);
    const { Attributes } = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId },
        UpdateExpression: clauses.join(' '),
        ExpressionAttributeNames: names,
        ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
        ReturnValues: 'ALL_NEW',
      })
    );
    return Attributes;
  },
};
