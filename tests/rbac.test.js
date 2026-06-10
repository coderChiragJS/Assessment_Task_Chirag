import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, PERMISSIONS, roleHasPermission } from '../src/config/rbac.js';

test('admin has every permission', () => {
  for (const permission of Object.values(PERMISSIONS)) {
    assert.equal(roleHasPermission(ROLES.ADMIN, permission), true, permission);
  }
});

test('user cannot create, assign, or delete tasks', () => {
  assert.equal(roleHasPermission(ROLES.USER, PERMISSIONS.TASK_CREATE), false);
  assert.equal(roleHasPermission(ROLES.USER, PERMISSIONS.TASK_ASSIGN), false);
  assert.equal(roleHasPermission(ROLES.USER, PERMISSIONS.TASK_DELETE), false);
});

test('user can update own task and comment', () => {
  assert.equal(roleHasPermission(ROLES.USER, PERMISSIONS.TASK_UPDATE_OWN), true);
  assert.equal(roleHasPermission(ROLES.USER, PERMISSIONS.COMMENT_CREATE), true);
});

test('manager can assign tasks but cannot manage users', () => {
  assert.equal(roleHasPermission(ROLES.MANAGER, PERMISSIONS.TASK_ASSIGN), true);
  assert.equal(roleHasPermission(ROLES.MANAGER, PERMISSIONS.USER_MANAGE), false);
});

test('unknown role has no permissions', () => {
  assert.equal(roleHasPermission('GUEST', PERMISSIONS.TASK_READ_OWN), false);
});
