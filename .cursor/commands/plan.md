# Command: plan

**Trigger**: User asks to plan a feature, refactor, or multi-step task (e.g. "plan the loads API", "plan migration to X").

## Steps

1. **Scope**: Clarify what is in/out of scope. Inputs, outputs, constraints.
2. **Areas**: List affected packages/apps (api, web, db, shared).
3. **Order**: Dependencies first. Shared → db → api → web. No step assumes later work.
4. **Deliverables**: Files to add/change, routes, types, tests.
5. **Risks**: Edge cases, breaking changes, env or config.
6. **Output**: Numbered or bulleted plan the user (or agent) can execute. Ask for approval only if scope is unclear.

## Output

- Plan as bulleted or numbered list.
- Optional: "Approve to execute" or "Reply with changes" so the user can confirm before execution.
