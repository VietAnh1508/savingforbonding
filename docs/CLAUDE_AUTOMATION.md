# Claude GitHub Automation

Two GitHub Actions workflows let Claude automatically triage issues and, for small changes, implement fixes and open PRs — without developer intervention.

## How It Works

```
User opens issue
   ↓
Claude triages it (~1 minute)
   ├─ complex → posts scoping comment + clarifying questions
   └─ trivial → posts comment ending with "Reply @claude go ahead to auto-implement"

Developer replies: "@claude go ahead"
   ↓
Claude implements the fix + opens a PR (~2 minutes)
```

```
 User              GitHub Issues      issue-triage       issue-autofix        PR
  │                    │                   │                   │               │
  ├── opens issue ─────►                   │                   │               │
  │                    ├── triggers ───────►                   │               │
  │                    │◄── comment ───────┤                   │               │
  │                    │    (if trivial: "Reply @claude go ahead")             │
  │                    │                   │                   │               │
  ├── "@claude go ahead" ─────────────────────────────────────►                │
  │                    │   guard: OWNER/COLLABORATOR, not Bot, on issue        │
  │                    │                   │   reads issue ────►               │
  │                    │                   │   implements      │               │
  │                    │                   │   typecheck       │               │
  │                    │                   │   git branch      │               │
  │                    │                   │                   ├── opens PR ───►
  │                    │◄────────────────────────── PR link ───┤               │
```

Claude decides whether an issue is trivial. For trivial issues, the developer's only required action is replying with `@claude go ahead`.

## Usage

### Getting a triage

Every new issue is automatically triaged. Claude will:

- Restate its understanding of the request in plain language
- Ask clarifying questions only about the desired outcome
- List files likely to change
- Assess complexity (trivial / simple / complex)

### Triggering an auto-fix

If Claude assessed an issue as trivial, reply with:

```
@claude go ahead
```

Claude reads the full thread, implements the fix, and opens a PR linked to the issue.

### When NOT to use auto-fix

- Don't approve if requirements are still unclear
- Don't approve for anything touching auth, DB schema, or core business logic (beer/vote calculation)
- If Claude says it needs developer input, provide that context first

## Setup

### 1. Add the OAuth token

The workflows use `anthropics/claude-code-action@v1`, which authenticates via a Claude Code OAuth token — the same credential the local `claude` CLI uses.

1. Run `claude setup-token` in your terminal and copy the output
2. Go to **GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret**
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: the token

> No separate GitHub App installation is required. The action runs Claude as a CLI binary inside the Actions runner — it only needs the OAuth token.

### 2. Add the workflow files

Commit both files to `.github/workflows/`:

| File                | Trigger                                             | Purpose                                        |
| ------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `issue-triage.yml`  | `issues: [opened]`                                  | Triages new issues; offers auto-fix if trivial |
| `issue-autofix.yml` | `issue_comment: [created]` (filtered to "go ahead") | Implements fix + creates PR                    |

### 3. Issue templates (optional but recommended)

The templates in `.github/ISSUE_TEMPLATE/` guide users to provide structured input (what went wrong, expected behaviour, reproduction steps). Better input → better triage → fewer clarifying questions.

## Workflow Details

### issue-triage.yml

| Setting      | Value                                                |
| ------------ | ---------------------------------------------------- |
| Trigger      | `issues: [opened]`                                   |
| Permissions  | `contents: read`, `issues: write`, `id-token: write` |
| Claude tools | `gh issue comment:*`, `gh issue view:*`              |

Claude posts a comment that:

- Restates the request in plain language (no technical jargon)
- Asks clarifying questions only about the _desired outcome_, not the implementation
- Privately classifies the issue as `trivial`, `simple`, or `complex`
- Appends `Reply @claude go ahead to auto-implement` **only** when the issue is trivial and fully clear

This triage step acts as a natural gate: complex or ambiguous work stays in the human queue without any extra logic.

### issue-autofix.yml

| Setting          | Value                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger          | `issue_comment: [created]`                                                                                                                                    |
| Guard conditions | Comment contains `@claude go ahead`; commenter is not a Bot; comment is on an issue (not a PR); commenter's `author_association` is `OWNER` or `COLLABORATOR` |
| Permissions      | `contents: write`, `issues: write`, `pull-requests: write`, `id-token: write`                                                                                 |
| Checkout branch  | `develop`                                                                                                                                                     |
| PR target        | `develop`                                                                                                                                                     |
| Max turns        | 30                                                                                                                                                            |
| Claude tools     | `Read`, `Write`, `Edit`, `gh issue view:*`, `gh issue comment:*`, `gh pr create:*`, `git:*`, `npm run typecheck:*`                                            |
| Env secrets      | `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_API_KEY` — all set to `""`                                                      |

Claude's implementation loop:

1. Reads the full issue thread (`gh issue view --comments`)
2. Implements the change following project conventions (TypeScript, Next.js App Router, tRPC, Tailwind v4)
3. Runs `npm run typecheck` and fixes any errors
4. Creates a new branch off `develop`
5. Opens a PR against `develop` with a clear title, summary, and `Closes #<issue-number>` to auto-close

## Security Design

**Tool allowlist** — Claude can only call specific commands. It cannot run arbitrary shell commands, access the internet, or touch the database. If a task requires a tool outside the list, it fails safely.

**Author association gate** — only `OWNER` and `COLLABORATOR` can trigger autofix. External contributors cannot self-approve their own issues. The `Bot` exclusion prevents recursive triggering (Claude's own triage comment cannot kick off autofix).

**No comment on PRs** — the `github.event.issue.pull_request == null` check ensures autofix only fires on issues, not PR review comments.

**Secrets explicitly cleared** — all database and auth secrets are set to `""` in the `env:` block. GitHub Actions does not automatically strip secrets from the environment, so this is the only reliable way to ensure Claude cannot read or log production credentials.

**Branch isolation** — all changes go to a new branch off `develop`, never directly to `main` or `develop`. A human must review and merge the PR.

## Lessons Learned

### What works well

- **Triage as a gate.** A separate triage step means Claude only self-assigns work it can genuinely handle. Complex issues naturally stay in the human queue.
- **Plain-English comments.** Prompting Claude to avoid code and file paths makes triage comments accessible to non-developers filing issues — the target audience for an app shared among friends.
- **Tool allowlist is worth the friction.** Restricting tools prevents subtle mistakes (e.g., Claude running `npm install` and modifying `package-lock.json`, or accidentally calling a seeding script).
- **Caching the Claude binary.** The `actions/cache` step on `~/.local` avoids re-downloading the CLI on every run, which meaningfully speeds up the workflow.

### Gotchas and pitfalls

- **`author_association` vs. `user.type`.** The triage workflow uses `user.type != 'Bot'` to exclude bots; `author_association` gatekeeps autofix. These are different fields — both checks are needed.
- **`id-token: write` is required** for OIDC-based authentication inside `claude-code-action`. Without it, the action cannot exchange credentials and will fail silently or with a confusing error.
- **Autofix fires on _any_ matching comment.** If an owner types `@claude go ahead` on a complex issue, autofix will attempt it. The triage prompt withholds the trigger phrase from complex issues, but it's not a hard block.
- **`npm run typecheck` is the only quality gate.** There is no test suite, so the TypeScript compiler is Claude's only automated feedback loop. It won't catch runtime behaviour regressions.
- **`base_branch: develop`** tells `claude-code-action` which branch to diff against when creating a PR. Without this, it may default to `main` and the PR will include unrelated commits from `develop`.
- **Triage fails when the issue reporter is not a repo collaborator.** When `claude-code-action` exchanges the GitHub OIDC token with Anthropic's backend, it checks whether the OIDC `actor` (the user who triggered the workflow — i.e., whoever opened the issue) has write access to the repository. External users who are not collaborators fail this check with `401 Unauthorized - User does not have write access on this repository`, and the workflow errors. In practice this means triage only works when the repo owner or a collaborator opens an issue. The fix is to authenticate via `ANTHROPIC_API_KEY` instead of `CLAUDE_CODE_OAUTH_TOKEN`. The OAuth token is tied to your personal GitHub identity, so Anthropic enforces that the triggering actor has write access to the repo as a security boundary — it won't act on repos the token owner can't control. An API key is an organisation-level credential with no GitHub identity attached, so this actor check does not apply. However, an API key requires a paid Anthropic API subscription, which is not currently available.

  ```
   External User   Actions Runner    Anthropic Backend   GitHub API
        │                │                   │                │
        ├─ open issue ──►│                   │                │
        │                │                   │                │
        │   actor = "ext-user" embedded in OIDC token         │
        │                │                   │                │
        │                ├── OIDC token ─────►                │
        │                │   + OAuth token   │                │
        │                │                   ├── does actor ──►
        │                │                   │   have write   │
        │                │                   │   access?      │
        │                │                   │◄── no ─────────┤
        │                │◄── 401 Unauth ────┤                │
        │         ✗ workflow errors          │                │
        │                │                   │                │
     Fix: ANTHROPIC_API_KEY has no GitHub identity attached   │
        │                ├── API key ────────►                │
        │                │   (no actor check)│                │
        │                │◄── ✓ authorized ──┤                │
  ```

## Disabling

To stop Claude from triaging new issues, disable `issue-triage.yml`:
**Repo → Actions → Triage new issues with Claude → ⋯ → Disable workflow**

To stop auto-fix without disabling triage, disable `issue-autofix.yml` the same way.

## File Reference

```
.github/
├── workflows/
│   ├── issue-triage.yml      # Triage new issues with Claude
│   └── issue-autofix.yml     # Auto-implement trivial issues
└── ISSUE_TEMPLATE/
    ├── bug-report.yml        # Structured bug report form
    └── feature-request.yml   # Structured feature request form
```
