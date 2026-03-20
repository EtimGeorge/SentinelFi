try {
  console.log('Attempting to boot NestJS application...');
  require('./dist/main.js');
} catch(e) {
  console.error('Crash caught:', e);
  process.exit(1);
}
