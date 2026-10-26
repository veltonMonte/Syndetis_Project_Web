import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const server = createApp(config).listen(config.port, '0.0.0.0', () => {
  console.info(JSON.stringify({ service: 'gateway', port: config.port, event: 'started' }));
});
server.headersTimeout = 10000;
server.requestTimeout = 30000;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
