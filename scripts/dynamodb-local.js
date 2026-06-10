import DynamoDbLocal from 'dynamodb-local';

const PORT = 8000;

async function main() {
  console.log('Starting DynamoDB Local on port', PORT, '(first run downloads the jar)...');

  await DynamoDbLocal.launch(PORT, null, ['-sharedDb'], false, true);
  console.log(`DynamoDB Local running at http://localhost:${PORT}`);
  console.log('   Next: `npm run create-tables` then `npm run seed`. Ctrl-C to stop.');
}

function shutdown() {
  console.log('\nStopping DynamoDB Local...');
  DynamoDbLocal.stop(PORT);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('Failed to start DynamoDB Local:', err);
  process.exit(1);
});
