'use strict';

const http = require('node:http');

/**
 * Creates the HTTP server. Storage is injected so tests get a fresh,
 * isolated store each time.
 */
function createApp(store = { tasks: [], nextId: 1 }) {
  const send = (res, status, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
  };

  const readJson = (req) =>
    new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1e5) {
          reject(Object.assign(new Error('Body too large'), { status: 413 }));
          req.destroy();
        }
      });
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const method = req.method;

    try {
      if (method === 'GET' && pathname === '/health') {
        return send(res, 200, { status: 'ok' });
      }

      if (method === 'GET' && pathname === '/tasks') {
        return send(res, 200, store.tasks);
      }

      if (method === 'POST' && pathname === '/tasks') {
        const body = await readJson(req);
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          return send(res, 400, { error: '"title" is required and must be a non-empty string' });
        }
        const task = { id: store.nextId++, title, done: false };
        store.tasks.push(task);
        return send(res, 201, task);
      }

      const match = pathname.match(/^\/tasks\/(\d+)\/done$/);
      if (match && method === 'PATCH') {
        const task = store.tasks.find((t) => t.id === Number(match[1]));
        if (!task) return send(res, 404, { error: 'Task not found' });
        task.done = true;
        return send(res, 200, task);
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      return send(res, err.status || 500, { error: err.status ? err.message : 'Internal server error' });
    }
  });
}

module.exports = { createApp };
