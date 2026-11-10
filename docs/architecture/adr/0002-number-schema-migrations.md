# 0002: Number schema migrations with `PRAGMA user_version`

Status: accepted

## Context

The database had one schema change before tags: the preview columns. The
repository added them on every start when `PRAGMA table_info` showed them
missing. Tags (#55) bring the second change, two new tables, and more will
follow. Checking for each column and table on every start grows with every
change and can't express a change that rewrites data.

Existing databases must keep working. One user runs one server, so there is no
second process that could migrate the same file at the same time.

## Decision

- `src/server/database.ts` keeps an ordered list of migrations. Migration n is
  at index n - 1. A migration that shipped never changes; a schema change
  appends a new one.
- On open, the server reads `PRAGMA user_version` and runs every migration above
  it, each in its own transaction that also sets `user_version` to its number.
  A failed migration rolls back and stops the server.
- Migration 1 creates the `drawings` table if it is missing and adds the preview
  columns if they are missing. That brings all three kinds of database from
  before numbered migrations, all at version 0, to the same schema: a new one,
  one from before previews and one with previews.
- Migration 2 adds the `tags` and `drawing_tags` tables.
- Migration 3 adds `tags.created_at`. Existing tags get times in their insertion
  (`rowid`) order: the newest gets the migration time, each older one a second
  less.
- `PRAGMA journal_mode = WAL` runs on every open, outside the migrations. It is a
  setting of the file, and SQLite can't change it inside a transaction.

## Alternatives

- **Keep checking for missing columns and tables on every start.** Needs no
  version, but each change adds another check that runs forever, and a data
  change can't be written this way.
- **A migration library.** More than one user and one SQLite file need. The
  runner is about 20 lines.
- **A table of applied migrations.** Records names and times, which helps when
  branches add migrations in parallel. That doesn't happen in this project, and
  `user_version` needs no table.
