import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { ddbClient } from '../src/config/dynamo.js';
import { TABLES, INDEXES } from '../src/config/tables.js';

const BILLING = { BillingMode: 'PAY_PER_REQUEST' };

const tableDefs = [
  {
    TableName: TABLES.USERS,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'teamId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: INDEXES.USERS_BY_EMAIL,
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: INDEXES.USERS_BY_TEAM,
        KeySchema: [{ AttributeName: 'teamId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: TABLES.TEAMS,
    KeySchema: [{ AttributeName: 'teamId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'teamId', AttributeType: 'S' }],
  },
  {
    TableName: TABLES.TASKS,
    KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' },
      { AttributeName: 'assigneeId', AttributeType: 'S' },
      { AttributeName: 'creatorId', AttributeType: 'S' },
      { AttributeName: 'teamId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: INDEXES.TASKS_BY_ASSIGNEE,
        KeySchema: [
          { AttributeName: 'assigneeId', KeyType: 'HASH' },
          { AttributeName: 'status', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: INDEXES.TASKS_BY_TEAM_STATUS,
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' },
          { AttributeName: 'status', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: INDEXES.TASKS_BY_CREATOR,
        KeySchema: [{ AttributeName: 'creatorId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: TABLES.COMMENTS,
    KeySchema: [
      { AttributeName: 'taskId', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
  },
  {
    TableName: TABLES.ACTIVITY,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'actorId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: INDEXES.ACTIVITY_BY_ACTOR,
        KeySchema: [
          { AttributeName: 'actorId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: TABLES.REFRESH_TOKENS,
    KeySchema: [{ AttributeName: 'tokenId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'tokenId', AttributeType: 'S' }],
  },
];

async function tableExists(name) {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return false;
    throw err;
  }
}

async function main() {
  for (const def of tableDefs) {
    if (await tableExists(def.TableName)) {
      console.log(`${def.TableName} already exists, skipping`);
      continue;
    }
    await ddbClient.send(new CreateTableCommand({ ...def, ...BILLING }));
    console.log(`created ${def.TableName}`);
  }
  console.log('All tables ready.');
}

main().catch((err) => {
  console.error('createTables failed:', err);
  process.exit(1);
});
