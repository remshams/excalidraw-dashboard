# Architecture

The application has three modules. The Fallow zones in `.fallowrc.json` enforce
their dependency rules.

| Module        | Owns                                                         | May import |
| ------------- | ------------------------------------------------------------ | ---------- |
| `src/shared/` | Request and response types of the HTTP API.                  | Nothing    |
| `src/server/` | HTTP API, SQLite storage and serving the client build.       | `shared`   |
| `src/client/` | React UI: drawing list, selection and the Excalidraw editor. | `shared`   |

## Server

- `drawing-store.ts` opens the SQLite database and owns all SQL. A drawing row
  holds its name, timestamps and the scene as a JSON string.
- `app.ts` builds the Hono app from a store. It exposes `/api/drawings` (list,
  create) and `/api/drawings/:id` (get, update, delete). With `staticDir` set, it
  also serves the Vite build and falls back to `index.html`.
- `index.ts` reads `PORT`, `DATA_DIR` and `NODE_ENV`, opens the store and starts
  the server. It holds no logic worth testing.

## Client

`src/client/drawings/` holds the drawings feature:
- `api.ts` wraps the HTTP API.
- `use-drawings.ts` loads the list and applies create, rename and delete.
- `use-drawing.ts` loads the selected drawing with its scene.
- `use-hash-id.ts` keeps the selected drawing ID in the URL hash.
- `DrawingList.tsx` renders the sidebar.
- `Editor.tsx` embeds Excalidraw and saves changes through `save-scheduler.ts`.

`App.tsx` composes these and shows request errors.

## Runtime flow

1. The client loads the list (`GET /api/drawings`) and, if the URL hash names a
   drawing, its scene (`GET /api/drawings/:id`).
2. `Editor` mounts Excalidraw with the stored scene. Excalidraw reports every
   change through `onChange`.
3. The save scheduler serializes the scene, waits for a one second pause and
   sends it with `PUT /api/drawings/:id`. It skips scenes equal to the last saved
   one. Switching drawings or leaving the page flushes a pending save.

## Tests

Vitest runs two projects from `vite.config.ts`:
- `server` tests the API through `app.request` against an in-memory SQLite store.
- `client` tests in jsdom with Testing Library. Component tests mock `api.ts` and
  replace `Editor.tsx`, since Excalidraw does not render in jsdom.

`pnpm coverage` writes `coverage/coverage-final.json`, which Fallow uses for CRAP
scores.
