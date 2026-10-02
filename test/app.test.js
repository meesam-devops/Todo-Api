'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(fn) {
  const server = createApp();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('add, list, and complete a task', async () => {
  await withServer(async (base) => {
    let res = await fetch(`${base}/tasks`);
    assert.deepEqual(await res.json(), []);

    res = await fetch(`${base}/tasks`, json('POST', { title: 'Write README' }));
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { id: 1, title: 'Write README', done: false });

    res = await fetch(`${base}/tasks/1/done`, { method: 'PATCH' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).done, true);

    res = await fetch(`${base}/tasks`);
    assert.equal((await res.json())[0].done, true);
  });
});

test('rejects missing or blank title', async () => {
  await withServer(async (base) => {
    for (const body of [{}, { title: '   ' }, { title: 42 }]) {
      const res = await fetch(`${base}/tasks`, json('POST', body));
      assert.equal(res.status, 400);
    }
  });
});

test('rejects malformed JSON', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
  });
});

test('404 for unknown task and unknown route', async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/tasks/99/done`, { method: 'PATCH' })).status, 404);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});
