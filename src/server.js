'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createApp();

server.listen(port, '0.0.0.0', () => {
  console.log(`todo-api listening on port ${port}`);
});

// Exit cleanly on `docker stop` instead of waiting for the SIGKILL timeout.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
