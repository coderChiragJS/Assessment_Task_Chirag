import { env } from '../config/env.js';

const bearer = [{ bearerAuth: [] }];

const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Internal Operations System API',
    version: '1.0.0',
    description:
      'Task management with role-based access control, an immutable activity log, ' +
      'enforced status workflow, and role-scoped dashboards. Built on Express + DynamoDB.',
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local' }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Teams' },
    { name: 'Tasks' },
    { name: 'Comments' },
    { name: 'Activity' },
    { name: 'Dashboard' },
    { name: 'Insights' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: { message: { type: 'string' }, details: { type: 'object' } },
          },
        },
      },
      AuthResult: {
        type: 'object',
        properties: {
          user: { type: 'object' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
          },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          teamId: { type: 'string' },
          creatorId: { type: 'string' },
          assigneeId: { type: 'string', nullable: true },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Auth'], summary: 'Health check', responses: { 200: { description: 'OK' } } },
    },

    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account (always created as USER)',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
            },
          }),
        },
        responses: {
          201: { description: 'Created', content: json(ref('AuthResult')) },
          409: { description: 'Email exists', content: json(ref('Error')) },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive access + refresh tokens',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          }),
        },
        responses: {
          200: { description: 'OK', content: json(ref('AuthResult')) },
          401: { description: 'Invalid credentials', content: json(ref('Error')) },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token for a new access token',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['refreshToken'],
            properties: { refreshToken: { type: 'string' } },
          }),
        },
        responses: { 200: { description: 'OK', content: json(ref('AuthResult')) } },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['refreshToken'],
            properties: { refreshToken: { type: 'string' } },
          }),
        },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current token identity',
        security: bearer,
        responses: { 200: { description: 'OK' }, 401: { description: 'Unauthorized' } },
      },
    },

    '/api/users': {
      post: {
        tags: ['Users'],
        summary: 'Create a user with any role (ADMIN only)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
              role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'] },
              teamId: { type: 'string' },
            },
          }),
        },
        responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden' } },
      },
      get: {
        tags: ['Users'],
        summary: 'List all users (ADMIN/MANAGER)',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Change a user role (ADMIN only)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['role'],
            properties: { role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'] } },
          }),
        },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/users/{id}/team': {
      patch: {
        tags: ['Users'],
        summary: 'Assign a user to a team (ADMIN only)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            properties: { teamId: { type: 'string', nullable: true } },
          }),
        },
        responses: { 200: { description: 'OK' } },
      },
    },

    '/api/teams': {
      post: {
        tags: ['Teams'],
        summary: 'Create a team (ADMIN only)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' }, managerId: { type: 'string' } },
          }),
        },
        responses: { 201: { description: 'Created' } },
      },
      get: {
        tags: ['Teams'],
        summary: 'List teams',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/teams/{id}': {
      get: {
        tags: ['Teams'],
        summary: 'Get a team with its members',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },

    '/api/tasks': {
      post: {
        tags: ['Tasks'],
        summary: 'Create a task (MANAGER/ADMIN)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
              assigneeId: { type: 'string' },
              teamId: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time' },
            },
          }),
        },
        responses: { 201: { description: 'Created', content: json(ref('Task')) } },
      },
      get: {
        tags: ['Tasks'],
        summary: 'List tasks (scoped to caller role) with filters + pagination',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
          { name: 'teamId', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'free-text search' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get a task',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: json(ref('Task')) }, 403: { description: 'Forbidden' } },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update task fields (MANAGER/ADMIN)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: json({
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
              dueDate: { type: 'string', format: 'date-time', nullable: true },
            },
          }),
        },
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task (MANAGER/ADMIN)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/tasks/{id}/assign': {
      patch: {
        tags: ['Tasks'],
        summary: 'Assign/reassign a task (MANAGER/ADMIN)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['assigneeId'],
            properties: { assigneeId: { type: 'string' } },
          }),
        },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/tasks/{id}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Change status (workflow-enforced). Owning USER or MANAGER/ADMIN.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['status'],
            properties: {
              status: {
                type: 'string',
                enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
              },
            },
          }),
        },
        responses: {
          200: { description: 'OK' },
          422: { description: 'Invalid transition', content: json(ref('Error')) },
        },
      },
    },
    '/api/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments on a task',
        security: bearer,
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add a comment',
        security: bearer,
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['body'],
            properties: { body: { type: 'string' } },
          }),
        },
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/activity/me': {
      get: {
        tags: ['Activity'],
        summary: 'My action history',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/activity/task/{taskId}': {
      get: {
        tags: ['Activity'],
        summary: 'Audit trail for a task',
        security: bearer,
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/activity/user/{userId}': {
      get: {
        tags: ['Activity'],
        summary: "Another user's activity (ADMIN only)",
        security: bearer,
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },

    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-scoped insights (admin global / manager team / user personal)',
        security: bearer,
        responses: { 200: { description: 'OK' } },
      },
    },

    '/api/insights/bottlenecks': {
      get: {
        tags: ['Insights'],
        summary:
          'Workflow Bottleneck Detector: diagnoses the stage where work gets stuck (MANAGER/ADMIN)',
        description:
          'Aggregates time-in-status across the team and names the throughput constraint, ' +
          'plus the tasks currently stuck longer than their stage average. Admins may pass ?teamId.',
        security: bearer,
        parameters: [
          {
            name: 'teamId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Admin only: target a specific teams',
          },
        ],
        responses: {
          200: { description: 'OK' },
          403: { description: 'Forbidden (USER role)' },
        },
      },
    },
  },
};
