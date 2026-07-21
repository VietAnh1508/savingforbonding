# Contributing to SavingForBonding

Thanks for wanting to help out! This is a small app built for a group of
friends, so the process is intentionally lightweight — pick whichever of the
two paths below fits what you want to do.

- **Have an idea or found a bug, but don't want to touch code?** → open an
  issue. See [Opening an issue](#opening-an-issue).
- **Want to make the change yourself?** → fork, branch, PR. See
  [Fork and pull request workflow](#fork-and-pull-request-workflow).

## Running the project locally

Full setup instructions (installing dependencies, environment variables,
database migrations, starting the dev server) live in [`README.md`](README.md)
— follow that first. Once the dev server is running at `http://localhost:3000`,
come back here for how to submit your change.

If you want the deeper architecture picture (data model, tRPC routers, how the
FIFA sync works, migration safety rules) before making a change, read
[`CLAUDE.md`](CLAUDE.md) too — it's the source of truth for how this codebase
is put together, not just guidance for Claude Code.

## Opening an issue

If you'd rather describe the problem or idea than fix it yourself, open an
issue — no code required:

- **Something broken?** Use the [bug report template](https://github.com/VietAnh1508/savingforbonding/issues/new?template=bug-report.yml).
- **An idea to make the app better?** Use the [feature request template](https://github.com/VietAnh1508/savingforbonding/issues/new?template=feature-request.yml).

Fill in as much as you can, but even a short description helps. A maintainer
will follow up, and for smaller issues may have it implemented automatically —
you don't need to do anything else.

## Fork and pull request workflow

This repo (`VietAnh1508/savingforbonding`) is itself a fork of an upstream
project. All contribution activity — your fork, your branches, your pull
requests — targets **this repo**, not the upstream one. Concretely:

1. **Fork this repo** on GitHub (the "Fork" button on
   `VietAnh1508/savingforbonding`).
2. **Clone your fork** and set it up locally per [`README.md`](README.md).
3. **Branch off `develop`** — that's this repo's default/base branch, not
   `main`. `main` only receives an automated nightly merge from `develop` and
   shouldn't be branched from or targeted directly.

   ```bash
   git checkout develop
   git pull
   git checkout -b your-branch-name
   ```

4. **Make your change.**
5. **Run the quality gates** before opening a PR:

   ```bash
   npm run typecheck   # required — the main correctness gate
   npm run test         # run this if your change touches src/lib/rank-history.ts;
                         # test coverage elsewhere is sparse by design, see CLAUDE.md
   ```

6. **Commit using [Conventional Commits](https://www.conventionalcommits.org/)**:
   `<type>(<scope>): <description>` (types: `feat`, `fix`, `chore`, `refactor`,
   `docs`, `style`, `test`). Imperative mood, ≤72 characters, no trailing
   period. Explain *why* in the body if the subject alone doesn't make it
   obvious — omit the body otherwise.
7. **Push your branch to your fork** and **open a pull request against this
   repo's `develop` branch** (GitHub defaults to this once you fork, but
   double-check the base branch before submitting).
8. Describe what changed and why, and link any related issue (e.g.
   `Closes #123`).

There's no automated CI gate on pull requests today — `typecheck` and `test`
are run locally and are what reviewers will expect to have already passed.

### A note on schema changes

If your change touches `prisma/schema.prisma`, read the "Database setup"
section of [`CLAUDE.md`](CLAUDE.md) before opening a PR — schema changes go
through reviewed Prisma migrations, not `prisma db push`, and there's a
documented incident (`docs/20260715_DATA-LOSS_POST-MORTEM.md`) explaining why
this matters.

## Questions

If anything here is unclear, open an issue with the feature-request template
and ask — that's a perfectly good use of it.
