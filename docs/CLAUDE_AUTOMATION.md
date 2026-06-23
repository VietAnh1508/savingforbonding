# Claude GitHub Automation

Automated issue triage and auto-fix powered by Claude Code.

## How it works

```
User opens issue
   ↓
Claude triages it within ~1 minute
   ├─ complex → posts scoping comment + clarifying questions
   └─ trivial → posts comment ending with:
                "Reply @claude go ahead to auto-implement"

Developer replies: "@claude go ahead"
   ↓
Claude implements the fix + opens a PR (~2 minutes)
```

Claude decides whether an issue is trivial. The developer's only required action for trivial issues is replying with `@claude go ahead`.

## Usage

### Getting a triage

Every new issue is automatically triaged. Claude will:
- Restate its understanding of the request
- Ask clarifying questions
- List the files likely to change
- Assess complexity (trivial / simple / complex)

### Triggering an auto-fix

If Claude assessed an issue as trivial, reply to it with:

```
@claude go ahead
```

Claude will read the full thread, implement the fix, and open a PR linked to the issue.

### When NOT to use auto-fix

- Don't approve auto-fix if the requirements are still unclear
- Don't approve auto-fix for anything touching auth, DB schema, or core business logic (beer/vote calculation)
- If Claude says it needs developer input, it means it — provide the missing context first

## Setup

### Required GitHub secret

| Secret | How to get it |
|--------|--------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Run `claude setup-token` locally, copy the output |

Add via: **Repo → Settings → Secrets and variables → Actions → New repository secret**

### Workflow files

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/issue-triage.yml` | `issues.opened` | Triages new issues, offers to auto-fix if trivial |
| `.github/workflows/issue-autofix.yml` | `issue_comment.created` (filtered to "go ahead") | Implements fix + creates PR |

## Disabling

To stop Claude from triaging new issues, disable the `issue-triage.yml` workflow:
**Repo → Actions → Triage new issues with Claude → ⋯ → Disable workflow**

To stop auto-fix without disabling triage, disable `issue-autofix.yml` the same way.
