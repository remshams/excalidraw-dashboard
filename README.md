# excalidraw-dashboard

A self-hosted Excalidraw with a landing page that shows your drawings as cards
with previews. Drawings autosave to a SQLite database on the server, so there is
no manual export or import.

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

Back up `drawings.db` in `DATA_DIR` to back up all drawings. Each stored scene uses
the `.excalidraw` file format.

See [AGENTS.md](AGENTS.md) for development rules and
[the architecture document](docs/architecture.md) for the code structure.
