import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCursor, decodeCursor } from '../src/lib/pagination.js';

test('encodes and decodes a DynamoDB key round-trip', () => {
  const key = { taskId: 'abc-123', status: 'TODO' };
  const cursor = encodeCursor(key);
  assert.equal(typeof cursor, 'string');
  assert.deepEqual(decodeCursor(cursor), key);
});

test('handles empty cursors safely', () => {
  assert.equal(encodeCursor(null), null);
  assert.equal(encodeCursor(undefined), null);
  assert.equal(decodeCursor(undefined), undefined);
});

test('returns undefined for a malformed cursor instead of throwing', () => {
  assert.equal(decodeCursor('%%%not-valid%%%'), undefined);
});
