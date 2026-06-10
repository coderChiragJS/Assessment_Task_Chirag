import { v4 as uuid } from 'uuid';
import { usersRepo } from '../src/repositories/users.repo.js';
import { teamsRepo } from '../src/repositories/teams.repo.js';
import { tasksRepo } from '../src/repositories/tasks.repo.js';
import { tasksService } from '../src/modules/tasks/tasks.service.js';
import { commentsService } from '../src/modules/comments/comments.service.js';
import { hashPassword } from '../src/lib/crypto.js';
import { ROLES } from '../src/config/rbac.js';
import { TASK_PRIORITY } from '../src/config/constants.js';
import { env } from '../src/config/env.js';

async function makeUser({ name, email, password, role, teamId = null }) {
  const user = {
    userId: uuid(),
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    role,
    teamId,
    createdAt: new Date().toISOString(),
  };
  await usersRepo.create(user);
  return user;
}

const actorOf = (u) => ({ id: u.userId, role: u.role, teamId: u.teamId, name: u.name });

async function main() {
  if (await usersRepo.getByEmail(env.SEED_ADMIN_EMAIL)) {
    console.log('Seed data already present, skipping.');
    return;
  }

  const team = { teamId: uuid(), name: 'Operations', managerId: null, createdAt: new Date().toISOString() };
  await teamsRepo.create(team);

  const admin = await makeUser({
    name: 'Sarah Chen',
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    role: ROLES.ADMIN,
    teamId: team.teamId,
  });
  const manager = await makeUser({
    name: 'Daniel Reyes',
    email: 'manager@smartops.dev',
    password: 'Manager@123',
    role: ROLES.MANAGER,
    teamId: team.teamId,
  });
  const user1 = await makeUser({
    name: 'Priya Nair',
    email: 'user1@smartops.dev',
    password: 'User@123',
    role: ROLES.USER,
    teamId: team.teamId,
  });
  const user2 = await makeUser({
    name: 'Tom Becker',
    email: 'user2@smartops.dev',
    password: 'User@123',
    role: ROLES.USER,
    teamId: team.teamId,
  });

  team.managerId = manager.userId;
  await teamsRepo.create(team);

  const mgr = actorOf(manager);

  const t1 = await tasksService.create(mgr, {
    title: 'Set up incident on-call rotation',
    description: 'Define the weekly rotation and escalation policy.',
    priority: TASK_PRIORITY.HIGH,
    assigneeId: user1.userId,
  });
  const t2 = await tasksService.create(mgr, {
    title: 'Migrate billing exports to new bucket',
    description: 'Move nightly CSV exports and update the cron.',
    priority: TASK_PRIORITY.URGENT,
    assigneeId: user2.userId,
  });
  await tasksService.create(mgr, {
    title: 'Write onboarding runbook',
    description: 'Step-by-step for new ops hires.',
    priority: TASK_PRIORITY.MEDIUM,
    assigneeId: user1.userId,
  });
  await tasksService.create(mgr, {
    title: 'Audit unused IAM roles',
    priority: TASK_PRIORITY.LOW,
  });

  await tasksService.changeStatus(actorOf(user1), t1.taskId, 'IN_PROGRESS');
  await tasksService.changeStatus(actorOf(user2), t2.taskId, 'IN_PROGRESS');
  await tasksService.changeStatus(actorOf(user2), t2.taskId, 'IN_REVIEW');

  const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  await tasksRepo.update(t2.taskId, { statusChangedAt: hoursAgo(72) });
  await tasksRepo.update(t1.taskId, { statusChangedAt: hoursAgo(20) });

  await commentsService.add(mgr, t1.taskId, 'Please coordinate with the SRE team.');
  await commentsService.add(actorOf(user1), t1.taskId, 'On it, drafting the policy now.');

  console.log('Seed complete.\n');
  console.log('Login credentials:');
  console.table([
    { role: 'ADMIN', email: admin.email, password: env.SEED_ADMIN_PASSWORD },
    { role: 'MANAGER', email: manager.email, password: 'Manager@123' },
    { role: 'USER', email: user1.email, password: 'User@123' },
    { role: 'USER', email: user2.email, password: 'User@123' },
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
