# 4. Scratchpads are drawings without a name, stored on their first stroke

## Status

Accepted

## Context

A new drawing needed a name before the editor opened. The user wants to start
drawing at once and decide later whether to keep the drawing, or throw it away.
Nothing drawn may be lost when the tab closes.

## Decision

A scratchpad is a drawing whose `name` is `null`, not a separate aggregate.
Saving it gives it a name through the existing rename, and discarding it deletes
it. A blank rename is still ignored, so a saved drawing never becomes a
scratchpad again.

The editor opens a new scratchpad at `/drawings/new` with a UUID the client
picks, and stores nothing until the scene shows something. Its first save sends
`POST /api/drawings` with the ID and the scene, and every later save is a `PUT`.
Because the ID is known from the start, the editor keeps its key and doesn't
remount when the drawing is stored. The URL then becomes `/drawings/<id>` in
place, so a reload reopens it.

Migration 4 drops `NOT NULL` from `drawings.name` by copying the table. Migrations
now run with foreign keys off, so dropping the old table keeps `drawing_tags`.

## Consequences

- Scratchpads are autosaved like any drawing, and one left without a decision
  waits in the Scratchpads row on the landing page.
- Opening the editor and leaving without drawing stores nothing, so no empty
  scratchpads pile up.
- Code that shows a name must handle `null`. Search, the tag filter and the quick
  switcher take only saved drawings, and scratchpads take no tags.
- Old scratchpads stay until the user discards them, one by one or with
  **Discard all**. Deleting them after some days is left for later.
- Leaving a new scratchpad within the save delay stores it after the user has
  left, when `/drawings/new` is no longer the current history entry, so it
  can't be replaced. Going back to it starts a new scratchpad; the stored one
  waits in the row.
- A `PUT` to a deleted drawing still answers 404 and creates nothing, so a late
  save can't bring a discarded scratchpad back.
