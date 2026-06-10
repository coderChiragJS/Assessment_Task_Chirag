import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES } from '../config/tables.js';

export const teamsRepo = {
  async create(team) {
    await ddb.send(new PutCommand({ TableName: TABLES.TEAMS, Item: team }));
    return team;
  },

  async getById(teamId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLES.TEAMS, Key: { teamId } })
    );
    return Item || null;
  },

  async listAll() {
    const { Items } = await ddb.send(new ScanCommand({ TableName: TABLES.TEAMS }));
    return Items || [];
  },
};
