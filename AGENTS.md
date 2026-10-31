# excalidraw-dashboard

A self-hosted Excalidraw with a list of drawings. The React client embeds
`@excalidraw/excalidraw` and autosaves each drawing to a small Hono server that
stores scenes in SQLite (`node:sqlite`). Node >= 24 runs the server's TypeScript
directly; only the client has a build step (Vite).

Run `pnpm dev` for the Vite dev server with the API behind its proxy. For
production, run `pnpm build && pnpm start`; the server then serves the build and
the API on `PORT` (default 3001) and stores the database in `DATA_DIR` (default
`./data`).

## Project context

- One person uses the application. Design for that user, not for teams or shared
  accounts.
- Keep the project small and simple. Handle realistic failure modes only; avoid
  speculative edge-case and race-condition hardening. If another tab changed a
  drawing, asking the user to reload is acceptable.
- Simple doesn't mean sloppy. The quality bar stays the same: correct behavior,
  clear errors, tests and the checks below.

## Architecture documentation

Start with [the architecture document](docs/architecture.md) for module ownership,
dependency rules, runtime flow and tests. Update it in the same change when
modules, dependencies or ownership change.

Keep the architecture document in two formats with the same content:
`docs/architecture.md` for agents and diffs, and a self-contained
`docs/architecture.html` for human readers. Update both in the same change. Use
the `frontend-design` skill when creating or redesigning the HTML version. Keep
the HTML self-contained so it works offline, with portable source links and no
machine-specific paths. If `docs/architecture.html` does not exist yet, create it
in the next change that updates the architecture document.

## Domain language

Describe architecture in Domain-Driven Design terms. This applies to
architecture documents, ADRs, issues, PR descriptions and explanations of the
code.
- Use the project's ubiquitous language: the words the domain uses, such as
  `drawing` and `scene`. Use the same word in code, docs and conversation, and
  don't switch between synonyms for one concept.
- Name the parts of the model by their DDD role. An entity keeps its identity as
  its data changes. A value object is defined by its values and is immutable. An
  aggregate is a cluster of objects that changes only through its root.
- Call stateless domain logic that belongs to no single type a domain service,
  and code that runs one use case an application service.
- Call the boundary within which one model and its language stay consistent a
  bounded context. The server code that stores drawings in SQLite is a
  repository; keep SQL out of the rest of the model.
- Use these terms to describe the code that exists. Don't add layers, interfaces
  or folders just to match a DDD pattern; keeping the project small still wins.

## Code organization

- Split code by feature, not by technical layer. Keep a feature's components,
  hooks, API calls and tests together, as `src/client/drawings/` does. Don't add
  folders such as `components/`, `hooks/` or `services/` that collect one
  technical role across features.
- Keep the zones from `.fallowrc.json`: `client` and `server` may import `shared`,
  never each other. `pnpm fallow:architecture` enforces this.
- Use `.ts` extensions in relative imports. The server runs without a build, and
  the client config allows the same style.
- Server code must use erasable TypeScript only: no enums, namespaces or
  parameter properties.

## React

- Write function components and hooks. Move state and effects out of components
  into feature hooks (`use-*.ts`) once a component grows beyond rendering.
- Treat Excalidraw as a black box behind `Editor.tsx`. Render it with
  `key={drawing.id}` so switching drawings remounts it with fresh initial data.
- Keep the Excalidraw serialization format (`serializeAsJSON(..., "local")`) as
  the stored scene. It matches exported `.excalidraw` files.
- Test components through what the user sees, with Testing Library queries by
  role and accessible name. Mock `api.ts` and `Editor.tsx` rather than `fetch` or
  Excalidraw internals in component tests.

## Development

Use pnpm. Run `pnpm check` before committing. It covers typecheck, Biome lint and
formatting, Vitest, the production build and all Fallow gates (dead code,
duplicates, architecture boundaries and health with a CRAP limit of 12 from fresh
coverage). Run `pnpm format` to fix formatting.

Mutation testing is optional locally: `pnpm mutation` checks changed code against
`origin/main`, configurable through `MUTATION_BASE`; `pnpm mutation:all` reports
the full score. The minimum score lives in the `mutation` script. Raise it as
coverage improves; do not lower it to pass changes.

Run `pnpm e2e` for the Playwright end-to-end tests. They build the client, start
the server on port 3101 with a fresh database in `.e2e-data/`, and run in
Chromium. Run `pnpm exec playwright install chromium` once before the first run.
`pnpm check` doesn't run them; CI runs them in its own `e2e` job.

## End-to-end tests

- Write E2E tests as black-box tests. Drive the application only through its
  public interface (CLI, HTTP API, or UI) and assert only on externally
  observable results such as output, exit codes, responses, persisted files, or
  rendered UI.
- Do not import internal modules, call internal functions, mock internal
  components, or inspect internal state from E2E tests. Set up preconditions
  through the public interface where possible. Test harness code that starts real
  external dependencies (servers, databases, proxies) is fine.
- Keep the tests in `e2e/`. Its Fallow zone may import nothing from `src/`, so
  `pnpm fallow:architecture` fails on an internal import.
- Find elements by role and accessible name.
- Group each test's actions and checks into `test.step` blocks written in the
  test itself, named after what the user does or sees, so the test and its report
  read as a scenario.
- Put repeated actions and locators in plain helpers without `test.step`:
  `e2e/drawings-ui.ts` for the UI and `e2e/drawings-api.ts` for the HTTP API.
- The tests share one server and database and run one at a time. Give every
  drawing a unique name with `uniqueName`, and don't assume the list is empty.

## GitHub issues

Follow the [GitHub issue guide](docs/github-issues.md) when creating or updating an
issue. Apply the `unslop` skill to the title and body before publishing.

## Pull request descriptions

Follow the [pull request description guide](docs/pull-request-descriptions.md)
when creating or updating a PR description. Apply the `unslop` skill before
publishing it. When you open a PR, decide whether it needs the `human review required`
label, as the guide describes, and set it.

Merge a PR with the label only after the maintainer approves it, through a GitHub review
or a message. Merge a PR without the label once CI passes and its CodeRabbit review is
handled. Leave the label on after approval.

## CodeRabbit

- CodeRabbit does not review pull requests automatically. Each PR gets one
  CodeRabbit review.
- Request it only when the PR is finished: your own review rounds are done, CI
  passes, and the branch is rebased onto its base. For a stack, wait until every
  layer is finished, then request one review per layer. Use
  `gh pr comment <n> --body "@coderabbitai review"`.
- Fix all actionable findings in one push and add a regression test for every fix
  that changes behavior. Reply on each thread with the commit that fixes it, or the
  reason for declining.
- Before replying, review the fix commits against the commit CodeRabbit reviewed,
  and check that each "Fixed in <sha>" reply points to a commit that addresses that
  finding.
- Do not request another review, except when a fix changes production behavior for
  a Major or Critical finding. Then request one incremental review with
  `@coderabbitai review`.
- If CodeRabbit replies that the rate limit is exceeded, wait the stated time, then
  trigger the request again. Count from when its message was posted; the number in
  it does not count down.

## Commits

- Use Conventional Commits: `<type>(<scope>): <description>`, e.g. `feat(DrawingList): ...`.
  Valid types: `feat`, `fix`, `refactor`, `chore`, `build`, `docs`, `perf`, `test`,
  `style`, `ci`, `revert`.
- Include the affected component or module name as the scope, in PascalCase.
- For e2e changes, prefix the component/module scope with `e2e-`, e.g.
  `feat(e2e-DrawingList): ...`.
- Unless instructed otherwise, commit changes in meaningful implementation chunks.
- Never mix files from different components or modules in one commit. Each commit
  must have a single component/module scope. Split changes across modules into
  separate commits. Repository moves and codebase formatting may each use one commit.
