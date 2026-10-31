# Architecture

The application has three modules. The Fallow zones in `.fallowrc.json` enforce
their dependency rules. A fourth zone, `e2e`, holds the end-to-end tests and may
import none of them.

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
- `use-drawings.ts` loads the list and applies create, rename and delete. It
  remembers which drawings it deleted.
- `use-drawing.ts` loads the selected drawing with its scene.
- `use-hash-id.ts` keeps the selected drawing ID in the URL hash.
- `DrawingList.tsx` renders the sidebar. Creating, renaming and deleting happen
  inline: names through `NameField.tsx`, deletion after a confirmation in the row.
- `Editor.tsx` embeds Excalidraw and saves changes through `save-scheduler.ts`.

`src/client/sidebar/` holds the sidebar that wraps the drawing list:
- `use-sidebar.ts` owns its width and collapsed state, saves both in
  `localStorage`, and handles resizing by pointer and arrow keys.
- `Sidebar.tsx` renders the resize handle and the collapsed rail. It passes the
  button that hides it to its content, which `DrawingList` shows in its header.

`App.tsx` composes these and shows request errors. `styles.css` holds the
look: colors from open-color, the palette Excalidraw draws with, and Excalidraw's
bundled fonts, Excalifont for drawing names and Assistant for controls.

## Runtime flow

1. The client loads the list (`GET /api/drawings`) and, if the URL hash names a
   drawing, its scene (`GET /api/drawings/:id`).
2. `Editor` mounts Excalidraw with the stored scene. Excalidraw reports every
   change through `onChange`.
3. The save scheduler serializes the scene, waits for a one second pause and
   sends it with `PUT /api/drawings/:id`. It skips scenes equal to the last saved
   one. Switching drawings or leaving the page flushes a pending save. When the
   open drawing is deleted with an edit pending, closing it flushes that edit,
   which then fails; `App` doesn't show errors for drawings it deleted.

## Tests

Vitest runs two projects from `vite.config.ts`:
- `server` tests the API through `app.request` against an in-memory SQLite store.
- `client` tests in jsdom with Testing Library. Component tests mock `api.ts` and
  replace `Editor.tsx`, since Excalidraw does not render in jsdom.

`pnpm coverage` writes `coverage/coverage-final.json`, which Fallow uses for CRAP
scores.

### End-to-end tests

Playwright runs the end-to-end tests in `e2e/` against the real application:
the production build, the Hono server, SQLite and Excalidraw in Chromium.
- `playwright.config.ts` builds the client and starts the server on port 3101
  with `DATA_DIR=.e2e-data`. The folder is deleted before each run and kept
  afterwards for debugging. The tests share this server and run one at a time.
- `drawings.spec.ts` covers creating, renaming and deleting a drawing, opening
  one from the URL hash, and a drawing surviving a reload. The reload test reads
  the saved scene from the API, then selects all shapes in the editor to show the
  scene was loaded back.
- Each test groups its actions and checks into `test.step` blocks, so the test
  and its report read as a scenario.
- `drawings-ui.ts` holds the locators and user actions for the drawings UI, and
  `drawings-api.ts` creates drawings and reads stored scenes through the HTTP API.
  Neither defines steps.

The tests are black-box. The `e2e` Fallow zone may import nothing from `src/`.
They run with `pnpm e2e` and in the `e2e` CI job, not in `pnpm check`.
