# UX Audit — SavingForBonding

You are orchestrating a parallel UX audit of the SavingForBonding football prediction app.

Invoke the **Workflow tool** with the script below. Do not modify the script — pass it verbatim as the `script` parameter.

---

## Pre-flight checklist (verify before running)

1. Dev server is running: `npm run dev` → http://localhost:3000
2. Dev account exists in the DB with `mustChangePassword: false`:
   - Email: `ux-audit@dev.local`
   - Password: `devpassword123`
3. Chrome extension is enabled and has permissions for `localhost:3000`

---

## Workflow script

```javascript
export const meta = {
  name: 'ux-audit-savingforbonding',
  description: 'Parallel UX audit across all app flows, then synthesize a ranked report',
  phases: [
    { title: 'Audit', detail: 'Run all 10 flows concurrently in separate browser tabs' },
    { title: 'Synthesize', detail: 'Combine findings into a ranked UX_AUDIT.md' },
  ],
}

const APP = 'http://localhost:3000'
const EMAIL = 'ux-audit@dev.local'
const PASSWORD = 'devpassword123'

const FLOWS = [
  {
    id: 1,
    name: 'Sign-in page & error state',
    instructions: `
Navigate to ${APP}/auth/signin (log out first if already logged in by going to ${APP}/api/auth/signout).
Screenshot the page cold.
Submit the form with an INCORRECT password to trigger the error state. Screenshot the error.
Evaluate: branding clarity, form layout, error message wording, sign-up link visibility, overall first impression for a new user.`,
  },
  {
    id: 2,
    name: 'Login (successful auth)',
    instructions: `
Navigate to ${APP}/auth/signin.
Log in with email "${EMAIL}" and password "${PASSWORD}" using form_input.
Screenshot the page you land on after login.
Evaluate: transition feel, first impression after successful login, whether a new user knows what to do next, any onboarding cues.`,
  },
  {
    id: 3,
    name: 'Home / upcoming matches list',
    instructions: `
Log in, then navigate to ${APP}/.
Screenshot the full page. If the list is long, scroll and screenshot again to capture the full range.
Evaluate: match card layout and information density, how upcoming vs completed matches are visually differentiated, how the voting CTA is surfaced on each card, date grouping or filters if present, empty state handling.`,
  },
  {
    id: 4,
    name: 'Vote on a match',
    instructions: `
Log in, then navigate to ${APP}/ and open an upcoming match that has not been voted on yet.
Screenshot the match detail or vote modal.
Cast a vote on one of the teams. Screenshot the confirmation state immediately after.
Evaluate: how teams and odds are presented, vote button prominence, feedback after casting (animation, message, state change), whether the result feels satisfying.`,
  },
  {
    id: 5,
    name: 'Already-voted match',
    instructions: `
Log in, then navigate to ${APP}/ and open a match that the dev account has already voted on (vote on one first if needed).
Screenshot the locked state.
Evaluate: how the locked-in vote is communicated, whether it is obvious which team was picked, whether changing a vote is possible and clearly signposted or intentionally prevented.`,
  },
  {
    id: 6,
    name: 'Completed match & result display',
    instructions: `
Log in, then navigate to ${APP}/ and open a match that has already finished.
Screenshot the result view.
Evaluate: how the final score is shown, correct/wrong outcome indication for the user's prediction, beer penalty display, how a missed vote (no prediction) is communicated.`,
  },
  {
    id: 7,
    name: 'Leaderboard',
    instructions: `
Log in, then navigate to ${APP}/leaderboard.
Screenshot the page. If there are tabs (global / weekly), screenshot both.
Evaluate: ranking clarity, how the current user's own row is highlighted, beer totals readability, tie handling, whether the page tells a meaningful story or just lists numbers.`,
  },
  {
    id: 8,
    name: 'Profile / my stats',
    instructions: `
Log in, then navigate to ${APP}/profile.
Screenshot the full page, scrolling if needed.
Evaluate: stats clarity and usefulness, missed matches section, voting history layout, whether the data gives the user a useful picture of their performance.`,
  },
  {
    id: 9,
    name: 'Rules page',
    instructions: `
Log in, then navigate to ${APP}/rules.
Screenshot the full page.
Evaluate: content clarity, length and scanability, whether a first-time user would understand the beer system and voting rules without help, findability from the nav.`,
  },
  {
    id: 10,
    name: 'Navigation & global chrome',
    instructions: `
Log in. Visit at least four different pages (home, leaderboard, profile, rules) and screenshot the nav bar or header on each.
Evaluate: whether every section is reachable in 2 taps or fewer, active state clarity, mobile-friendliness of tap targets, consistency across pages, any dead ends or confusing labels.`,
  },
]

const AUDIT_PROMPT = (flow) => `
You are a UX designer auditing a single flow of the SavingForBonding football prediction app.

## Your flow: Flow ${flow.id} — ${flow.name}

## Setup
1. Load browser tools with ToolSearch:
   select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool

2. Create a NEW tab with tabs_create_mcp (do not reuse existing tabs).

## Instructions
${flow.instructions}

## Evaluation dimensions
For each screen, note issues only — skip dimensions that are fine:
- Visual hierarchy: Is the most important information immediately prominent?
- CTA clarity: Is the primary action obvious?
- Empty / loading states: Handled gracefully or blank?
- Feedback after actions: Does the UI respond instantly and confirm what happened?
- Information density: Too much or too little on screen?
- Mobile readiness: Tap targets, text size, layout at phone width?
- Friction: More steps or clicks than necessary?
- Confusion: What might a first-time user misunderstand?

## Output format
Return ONLY a JSON object (no markdown wrapper) with this shape:
{
  "flow_id": ${flow.id},
  "flow_name": "${flow.name}",
  "summary": "2-3 sentence overall impression of this flow",
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "element": "specific UI element name",
      "issue": "what is wrong or suboptimal",
      "suggestion": "concrete actionable fix"
    }
  ]
}

Be specific. Every issue must name an exact element and have a concrete suggestion. Do not include issues where the experience is fine.
`

const SYNTHESIS_PROMPT = (results) => `
You are synthesizing UX audit findings from 10 separate flow audits of the SavingForBonding football prediction app into a single ranked report.

## Raw findings

${JSON.stringify(results, null, 2)}

## Output

Write the complete contents of UX_AUDIT.md using this structure:

# UX Audit — SavingForBonding

_Parallel audit across 10 flows._

## Executive Summary
2–3 sentences on the overall experience quality and the most important theme.

## Top Findings (ranked by impact)

### 🔴 High impact
Issues that cause real friction or confusion. List as: **[Element]** — issue. Suggestion: fix.

### 🟡 Medium impact
Rough edges that reduce polish.

### 🟢 Low impact / Nice to have
Minor improvements or additive features.

---

## Flow-by-flow notes

One subsection per flow. Use the summary and issues from each flow's findings.

---

## Quick wins
Checklist of changes that are low effort but high visibility — things a developer could knock out in an afternoon.

- [ ] …

## Feature suggestions
New capabilities worth considering based on observed friction.

- [ ] …

---

Rules:
- Use specific element names. Every issue must have a concrete suggestion.
- Deduplicate issues that appeared in multiple flows — mention them once in the top findings.
- Prioritise findings that affect the core loop: sign in → browse matches → vote → check leaderboard.
- Return ONLY the markdown content, no wrapper.
`

phase('Audit')
log('Spawning 10 parallel flow auditors...')

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    flow_id: { type: 'number' },
    flow_name: { type: 'string' },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          element: { type: 'string' },
          issue: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'element', 'issue', 'suggestion'],
      },
    },
  },
  required: ['flow_id', 'flow_name', 'summary', 'issues'],
}

const results = await parallel(
  FLOWS.map(flow => () =>
    agent(AUDIT_PROMPT(flow), {
      label: `flow-${flow.id}: ${flow.name}`,
      phase: 'Audit',
      schema: FINDINGS_SCHEMA,
    })
  )
)

const valid = results.filter(Boolean)
log(`${valid.length}/10 flows completed. Synthesizing...`)

phase('Synthesize')
const report = await agent(SYNTHESIS_PROMPT(valid), {
  label: 'synthesize → UX_AUDIT.md',
  phase: 'Synthesize',
})

return { report, flowCount: valid.length }
```

---

## After the workflow completes

Write the `report` string returned by the workflow to `/Users/toah/Coding/savingforbonding/UX_AUDIT.md`.

Tell the user:
- How many flows completed successfully
- The top 2–3 high-impact findings
- That `UX_AUDIT.md` has been written
