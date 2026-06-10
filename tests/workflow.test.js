import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/config/constants.js';

test('allows forward workflow moves', () => {
  assert.equal(canTransition('TODO', 'IN_PROGRESS'), true);
  assert.equal(canTransition('IN_PROGRESS', 'IN_REVIEW'), true);
  assert.equal(canTransition('IN_REVIEW', 'DONE'), true);
});

test('allows reopening and blocking', () => {
  assert.equal(canTransition('DONE', 'TODO'), true);
  assert.equal(canTransition('IN_PROGRESS', 'BLOCKED'), true);
  assert.equal(canTransition('BLOCKED', 'IN_PROGRESS'), true);
});

test('rejects skipping stages', () => {
  assert.equal(canTransition('TODO', 'DONE'), false);
  assert.equal(canTransition('TODO', 'IN_REVIEW'), false);
  assert.equal(canTransition('DONE', 'IN_PROGRESS'), false);
});

test('rejects unknown source status', () => {
  assert.equal(canTransition('ARCHIVED', 'TODO'), false);
});
