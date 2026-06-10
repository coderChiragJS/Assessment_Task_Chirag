import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Smart Ops API listening on http://localhost:${env.PORT}`);
  console.log(`API docs at http://localhost:${env.PORT}/docs`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
