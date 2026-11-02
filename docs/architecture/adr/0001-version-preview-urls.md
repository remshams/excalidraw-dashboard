# 0001: Version preview URLs with their own timestamp

Status: accepted

## Context

Each drawing can store a PNG preview. The redesign (#14) plans to show previews
on the landing page and in the quick switcher. The editor will upload a new
preview after a save (#5), and render one for an older drawing the first time it
is opened.

The client is a single page that never reloads. Browsers keep the images a page
has loaded in memory and reuse them by URL, often without asking the server,
even when the response says `no-cache`. React also doesn't reload an `<img>`
whose `src` stays the same. A fixed preview URL would therefore keep showing the
old image after an edit until a full reload.

`updatedAt` means that the drawing's name or scene changed. The planned quick
switcher (#8) sorts by it, as "most recently edited".

## Decision

- The drawing summary carries `previewUpdatedAt`: when the preview was last set,
  or `null` if the drawing has none. Setting or removing a preview changes it
  and leaves `updatedAt` alone.
- The client requests `/api/drawings/:id/preview?v=<previewUpdatedAt>`. The
  server ignores the query string.
- `GET /api/drawings/:id/preview` answers with
  `Cache-Control: private, max-age=31536000, immutable`.

A new preview gets a new URL, which the browser fetches once. It never asks the
server again for a URL it already has.

## Alternatives

- **Bump `updatedAt` and version the URL with it.** Rendering a missing preview
  when a drawing is opened would then count as an edit, and move the drawing to
  the top of the quick switcher.
- **A fixed URL with `no-cache` and an `ETag`.** The browser revalidates over
  HTTP, but the in-page image cache can still show the old preview.
- **A fixed URL with `no-store`.** The same staleness, plus a full download each
  time.

## Consequences

- Clients build the preview URL from the summary; a drawing without
  `previewUpdatedAt` has no preview to request.
- Cache entries for old versions expire unused.
- A preview change doesn't change `updatedAt`, so it doesn't reorder any list
  sorted by it.
