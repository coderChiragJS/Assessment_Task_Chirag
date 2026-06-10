import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from './env.js';

const baseClient = new DynamoDBClient({
  region: env.AWS_REGION,
  ...(env.DYNAMODB_ENDPOINT
    ? {
        endpoint: env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const ddbClient = baseClient;

export const ddb = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});
