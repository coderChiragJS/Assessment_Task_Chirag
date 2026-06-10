import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../config/dynamo.js';
import { TABLES } from '../config/tables.js';

export const refreshTokensRepo = {
  async save({ tokenId, userId, expiresAt }) {
    await ddb.send(
      new PutCommand({
        TableName: TABLES.REFRESH_TOKENS,
        Item: { tokenId, userId, expiresAt },
      })
    );
  },

  async get(tokenId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLES.REFRESH_TOKENS, Key: { tokenId } })
    );
    return Item || null;
  },

  async revoke(tokenId) {
    await ddb.send(
      new DeleteCommand({ TableName: TABLES.REFRESH_TOKENS, Key: { tokenId } })
    );
  },
};
