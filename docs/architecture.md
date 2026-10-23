# Architecture

The application has three modules. The Fallow zones in `.fallowrc.json` enforce
their dependency rules.

| Module        | Owns                                                          | May import |
| ------------- | ------------------------------------------------------------- | ---------- |
| `src/shared/` | Request and response types of the HTTP API.                   | Nothing    |
| `src/server/` | HTTP API, SQLite storage and serving the client build.        | `shared`   |
| `src/client/` | React UI: landing page of drawings and the Excalidraw editor. | `shared`   |

## Server

- `drawing-store.ts` opens the SQLite database and owns all SQL. A drawing row
  holds its name, timestamps, the scene as a JSON string and a PNG preview. On
  open it adds the preview column to databases that lack it.
- `app.ts` builds the Hono app from a store. It exposes `/api/drawings` (list,
  create), `/api/drawings/:id` (get, update, delete) and
  `/api/drawings/:id/preview` (get, put, delete). Saving or removing a preview
  counts as an update and changes `updatedAt`. With `staticDir` set, it also
  serves the Vite build and falls back to `index.html`.
- `index.ts` reads `PORT`, `DATA_DIR` and `NODE_ENV`, opens the store and starts
  the server. It holds no logic worth testing.

## Client

`src/client/drawings/` holds the drawings feature:
- `api.ts` wraps the HTTP API.
- `use-drawings.ts` loads the list and applies create, rename and delete.
- `use-drawing.ts` loads the selected drawing with its scene.
- `use-hash-id.ts` keeps the open drawing ID in the URL hash.
- `DrawingList.tsx` renders the landing page: a card per drawing with its
  preview, and a blank card that starts a new one. A search field filters the
  cards by name. Creating, renaming and
  deleting happen inline: names through `NameField.tsx`, deletion after a
  confirmation in the card.
- `Editor.tsx` embeds Excalidraw and saves changes through `save-scheduler.ts`.
- `preview.ts` renders a saved scene as a PNG with Excalidraw's `exportToBlob`
  and uploads it, or removes the preview when nothing is drawn.

`App.tsx` shows the landing page while no drawing is open, and otherwise the
editor below a bar that leads back. It also shows request errors. `styles.css` holds the
look: colors from open-color, the palette Excalidraw draws with, and Excalidraw's
bundled fonts, Excalifont for drawing names and Assistant for controls.

## Runtime flow

1. The client loads the list (`GET /api/drawings`). Cards load previews from
   `GET /api/drawings/:id/preview?v=<updatedAt>`, so each version is fetched once.
2. Opening a card puts its ID in the URL hash, and the client loads its scene
   (`GET /api/drawings/:id`).
3. `Editor` mounts Excalidraw with the stored scene. Excalidraw reports every
   change through `onChange`. A drawing with a scene but no preview gets one now.
4. The save scheduler serializes the scene, waits for a one second pause and
   sends it with `PUT /api/drawings/:id`. It skips scenes equal to the last saved
   one. Going back to the list or leaving the page flushes a pending save.
5. After each scene save, the editor uploads a new preview and hands the
   returned summary to the list.

## Tests

Vitest runs two projects from `vite.config.ts`:
- `server` tests the API through `app.request` against an in-memory SQLite store.
- `client` tests in jsdom with Testing Library. Component tests mock `api.ts` and
  replace `Editor.tsx`, since Excalidraw does not render in jsdom. The preview
  test mocks `exportToBlob` for the same reason.

`pnpm coverage` writes `coverage/coverage-final.json`, which Fallow uses for CRAP
scores.
