# excalidraw-dashboard

A self-hosted Excalidraw that opens on a page of named drawings, each shown as a
card with a preview. Drawings autosave to a SQLite database on the server, so
there is no manual export or import.

## Usage

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev                    # Vite on :5173, API on :3001
pnpm build && pnpm start    # Production server with client and API on :3001
```

| Variable   | Default  | Purpose                    |
| ---------- | -------- | -------------------------- |
| `PORT`     | `3001`   | HTTP port                  |
| `DATA_DIR` | `./data` | Directory of `drawings.db` |

Back up `DATA_DIR` to back up all drawings. Stop the server before copying the
folder. For a backup while the server runs, use SQLite's `VACUUM INTO`, for
example `sqlite3 data/drawings.db "VACUUM INTO 'backup.db'"`. Each stored scene
uses the `.excalidraw` file format.

## Docker

The [`Dockerfile`](Dockerfile) builds one image with the client and the server.
It runs as the `node` user, listens on port 3001 and keeps the database in
`/data`, which is usually a bind mount owned by UID 1000:

```sh
docker build -t excalidraw-dashboard .
docker run -d -p 127.0.0.1:3001:3001 -v "$PWD/data:/data" excalidraw-dashboard
```

Its health check calls `/api/drawings`. The app has no login, so publish it
only where everyone who can reach it may read and change every drawing, such as
a private network.

See [AGENTS.md](AGENTS.md) for development rules and
[the architecture document](docs/architecture/architecture.md) for the code structure.
