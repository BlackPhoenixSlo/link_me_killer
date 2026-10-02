# 25: The v1 Import refuses a broken v1 tree, names each bad file and writes nothing

Spec: docs/spec/phase-02-vps-foundation.md
Covers: user stories 24
Seams: the v1 Import CLI, run as the Operator runs it (`docker compose --env-file tests/e2e.env run --rm -v <tree>:/v1:ro app npm run --silent import-v1 -- …`) against the running test stack. Afterwards PocketBase's REST API is read as the superuser, so "writes nothing" is checked against real state rather than inferred from an exit code. The spec runs in the last Playwright project.
Blocked by: 19: Every v1 Profile opens on v2 from PocketBase, seeded by the v1 Import…
Status: ready-for-agent

**What to build:** The v1 Import validates every file before it contacts PocketBase. Corrupted v1 data never lands in v2.

- **Refusals.** Each of these refuses the whole import:
  - invalid JSON;
  - a Link Id that appears twice across the Profile files;
  - a Link Id that appears in two secrets files.

  The import exits non-zero, prints one `invalid v1 file: <path>: <reason>` line per problem, and writes nothing.
- **Case twins.** A case-sensitive checkout of v1, such as a git clone on the VPS, holds capitalised copies of three Profile files. The import checks for them before the duplicate-id check:
  - A file whose lower-cased name matches another file with the same bytes is skipped, with a `case twin skipped: <file>` warning.
  - One whose bytes differ is refused.

  This Mac's file system cannot hold both names (the spec, v1 Import, Case twins), so the twin cases run on a tree assembled inside the container.

- [ ] A broken fixture tree holds one valid Profile (`importcheck_ok`), one file of invalid JSON, and one file that repeats a Link Id. Importing it:
  - exits non-zero;
  - prints an `invalid v1 file:` line naming each bad file;
  - leaves PocketBase with no `importcheck_ok` Profile, and with the same Profile and Link counts as before the run.
- [ ] A seed tree given two secrets files that share a Link Id is refused the same way. The line names the Link Id, never its Destination, and PocketBase is unchanged.
- [ ] A tree holding a capitalised twin with the same bytes imports, with one `case twin skipped` warning. A twin whose bytes differ is refused, and nothing is written.
- [ ] No output line, on success or failure, prints a Destination.
- [ ] The spec runs in the last project, after every spec that reads seeded Profiles.
- [ ] Playwright: adds `tests/e2e/02-v1-import.spec.ts`. `./check.sh` passes.
