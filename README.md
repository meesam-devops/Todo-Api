# todo-api

A tiny to-do list API with in-memory storage. Written in Node.js using only the
standard library (no dependencies), packaged in Docker, and built by GitHub
Actions on every push.

## Run it

**With Docker**

```bash
docker build -t todo-api .
docker run --rm -p 3000:3000 todo-api
```

**Without Docker** (Node 20+)

```bash
npm start        # listens on port 3000, override with PORT=8080
npm test         # runs the test suite
```

Try it:

```bash
curl -X POST localhost:3000/tasks -H 'Content-Type: application/json' \
     -d '{"title":"Buy milk"}'
curl localhost:3000/tasks
curl -X PATCH localhost:3000/tasks/1/done
```

## Endpoints

| Method | Path               | What it does                                                                 |
|--------|--------------------|------------------------------------------------------------------------------|
| POST   | `/tasks`           | Add a task. Body: `{"title": "..."}`. Returns `201` and the new task.        |
| GET    | `/tasks`           | List all tasks as a JSON array.                                              |
| PATCH  | `/tasks/:id/done`  | Mark a task as done. Returns the updated task, or `404` if the id is unknown.|
| GET    | `/health`          | Returns `{"status":"ok"}`. Used by the Docker healthcheck and the CI smoke test. |

A task looks like `{"id": 1, "title": "Buy milk", "done": false}`.
A missing/blank `title` or malformed JSON returns `400` with `{"error": "..."}`.

Data lives in memory, so it is lost when the process restarts.

## CI

`.github/workflows/docker-build.yml` runs on every push and pull request. It runs
the tests, builds the Docker image (without pushing it anywhere), then starts the
container and checks `/health`, so a build that produces an image that does not
actually boot will still fail.

## Reflection

**Trickiest part.** Keeping the scope small. Three endpoints is easy to build;
the harder part is deciding how much around them is worth doing. Validation,
error responses, graceful shutdown, and a non-root container user are each small,
but together they are the difference between a demo and something that behaves
properly in a container. The second trickiest part was `docker stop`: Node as
PID 1 ignores SIGTERM by default, so without the signal handler in `server.js`
the container hangs for 10 seconds before being killed.

**Why these choices.**
- *Node with no dependencies:* the built-in `http` module is plenty for three
  routes, and it means the image has no install step, no `node_modules`, and no
  supply-chain surface. The cost is hand-written routing and body parsing.
- *`PATCH /tasks/:id/done`:* marking done is a partial update of an existing
  resource, so PATCH fits better than POST, and the explicit `/done` path keeps
  the intent obvious.
- *`node:22-alpine`, non-root user, healthcheck:* small image, least privilege,
  and a way for the orchestrator to know the app is actually serving.
- *Smoke test in CI:* the brief only required that the image builds, but a
  successful build says little if the container crashes on startup. Starting it
  and hitting `/health` is a few lines and catches that.
- *In-memory store injected into `createApp`:* each test gets a fresh store, so
  tests do not depend on each other.

**With another day.**
- Persist data (SQLite for a single container, Postgres if it needs to scale
  beyond one replica; in-memory state breaks as soon as you run two instances).
- Add `DELETE /tasks/:id`, un-marking a task, and pagination on the list.
- Use a real framework (Fastify or Express) with schema validation once the
  routes grow; hand-rolled routing does not scale past a handful of endpoints.
- Pin the base image by digest, add a Trivy or Grype scan to CI, and push tagged
  images to GHCR on release.
- Add request logging, and a multi-stage build once there are dependencies to
  install.
# Todo-Api
