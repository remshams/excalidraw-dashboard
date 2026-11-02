# excalidraw-dashboard

A self-hosted Excalidraw with a sidebar of named drawings. Drawings autosave to a
SQLite database on the server, so there is no manual export or import.

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

See [AGENTS.md](AGENTS.md) for development rules and
[the architecture document](docs/architecture/architecture.md) for the code structure.
