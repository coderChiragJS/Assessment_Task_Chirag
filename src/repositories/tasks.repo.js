import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES, INDEXES } from '../config/tables.js';
import { OPEN_STATUSES } from '../config/constants.js';

export const tasksRepo = {
  async create(task) {
    await ddb.send(
      new PutCommand({
        TableName: TABLES.TASKS,
        Item: task,
        ConditionExpression: 'attribute_not_exists(taskId)',
      })
    );
    return task;
  },

  async getById(taskId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLES.TASKS, Key: { taskId } })
    );
    return Item || null;
  },

    async update(taskId, attrs) {
    const names = {};
    const values = {};
    const sets = [];
    for (const [k, v] of Object.entries(attrs)) {
      names[`#${k}`] = k;
      values[`:${k}`] = v;
      sets.push(`#${k} = :${k}`);
    }
    const { Attributes } = await ddb.send(
      new UpdateCommand({
        TableName: TABLES.TASKS,
        Key: { taskId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );
    return Attributes;
  },

  async remove(taskId) {
    await ddb.send(new DeleteCommand({ TableName: TABLES.TASKS, Key: { taskId } }));
  },

    async listByAssignee(assigneeId, { status, limit, cursor } = {}) {
    const params = {
      TableName: TABLES.TASKS,
      IndexName: INDEXES.TASKS_BY_ASSIGNEE,
      KeyConditionExpression: status ? 'assigneeId = :a AND #s = :s' : 'assigneeId = :a',
      ExpressionAttributeValues: { ':a': assigneeId, ...(status ? { ':s': status } : {}) },
      ...(status ? { ExpressionAttributeNames: { '#s': 'status' } } : {}),
      ...(limit ? { Limit: limit } : {}),
      ...(cursor ? { ExclusiveStartKey: cursor } : {}),
    };
    const out = await ddb.send(new QueryCommand(params));
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },

    async listByCreator(creatorId, { limit, cursor } = {}) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.TASKS,
        IndexName: INDEXES.TASKS_BY_CREATOR,
        KeyConditionExpression: 'creatorId = :c',
        ExpressionAttributeValues: { ':c': creatorId },
        ...(limit ? { Limit: limit } : {}),
        ...(cursor ? { ExclusiveStartKey: cursor } : {}),
      })
    );
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },

    async listByTeam(teamId, { status, limit, cursor } = {}) {
    const params = {
      TableName: TABLES.TASKS,
      IndexName: INDEXES.TASKS_BY_TEAM_STATUS,
      KeyConditionExpression: status ? 'teamId = :t AND #s = :s' : 'teamId = :t',
      ExpressionAttributeValues: { ':t': teamId, ...(status ? { ':s': status } : {}) },
      ...(status ? { ExpressionAttributeNames: { '#s': 'status' } } : {}),
      ...(limit ? { Limit: limit } : {}),
      ...(cursor ? { ExclusiveStartKey: cursor } : {}),
    };
    const out = await ddb.send(new QueryCommand(params));
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },

    async listOpenByAssignee(assigneeId) {
    const collected = [];
    for (const status of OPEN_STATUSES) {
      const { items } = await this.listByAssignee(assigneeId, { status });
      collected.push(...items);
    }
    return collected;
  },

    async listAll({ limit, cursor } = {}) {
    const out = await ddb.send(
      new ScanCommand({
        TableName: TABLES.TASKS,
        ...(limit ? { Limit: limit } : {}),
        ...(cursor ? { ExclusiveStartKey: cursor } : {}),
      })
    );
    return { items: out.Items || [], lastKey: out.LastEvaluatedKey };
  },
};
