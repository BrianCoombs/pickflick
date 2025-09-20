/project:code — apply plan tasks. `/project:code [implementation notes]`

# CODE Command

> **Never modify code until the user explicitly approves each task.**

---

## Purpose

Implement the steps defined in `.scratchpad/<subfolder>/plan.md`, one task at a time, validating each change with the user and recording progress in `.scratchpad/<subfolder>/code.md`.

## STRICT RULES
- **NEVER** edit code without explicit task approval (user must say "proceed")
- **MUST** prompt for subfolder name before starting
- **MUST** check for `.scratchpad/<subfolder>/plan.md` and exit if missing
- **MUST** update `.scratchpad/<subfolder>/code.md` after EVERY task completion
- **MUST** validate each change with tests or manual confirmation
- **MUST** mark temporary assets with `CLEANUP_REFACTOR`
- **MUST** only have ONE task in_progress at any time
- **MUST** continue task loop until all tasks complete AND user approves
- **MUST** return to task loop if final approval is not given
- **MUST** summarize log findings, never show raw command syntax or full logs

## Preconditions

1. **MUST** prompt for subfolder name before starting implementation
2. `.scratchpad/<subfolder>/plan.md` **must exist**. If absent → inform the user to run `/project:plan` first and exit.
3. If `.scratchpad/<subfolder>/code.md` exists, load it to resume partial work.

## Accepted Arguments

`ARGUMENTS:` Free-form notes or overrides for this coding session.

### Example ARGUMENTS Usage
- `/project:code Skip the email service tests for now`
- `/project:code Focus on error handling in all new functions`
- `/project:code Use async/await pattern throughout`

## High-Level Workflow

1. **Kick-off:** Ask the user →
   *"What subfolder name should I use for this implementation? (same as plan subfolder)"*

2. **Load Context**
   * Read plan + prior code scratchpad from `.scratchpad/<subfolder>/`.

3. **Task Loop**
   For each incomplete task:

   1. **Propose** – Briefly outline planned edits (files, functions, commands).
   2. **Feedback** – Iterate until user replies `proceed`.
   3. **Edit** – Apply changes via **Edit** tool.
   4. **Validate** –
      * Write & run a quick test **or** prompt user for manual test.
      * Wait for user to reply `done` or give feedback.
      * If logs are relevant, automatically run `docker logs <container> | grep -i "<keyword>"` and summarize matching lines only.
      * Mark any temporary assets like files, logs, or functions with `CLEANUP_REFACTOR`.
   5. **Record Progress** – Update scratchpad (overview, task progress, notes).

4. **Completion Check**
   * When all tasks are done, present final report and ask for **approve**.
   * If user gives feedback instead of approval:
     - Add/modify tasks as needed
     - **MUST** return to Task Loop (step 3)
     - Continue implementing new/modified tasks

5. **Exit**
   * When the user replies exactly `approve`:
   * Say "Code implementation complete! Progress has been saved to `.scratchpad/<subfolder>/code.md`. Use `/project:commit` when ready to commit changes."
   * **MUST** end the command completely and wait for next user instruction
   * **NEVER** automatically continue to commit or any other action

## Scratchpad Behaviour

* **Path:** `.scratchpad/<subfolder>/code.md` – overwritten after every task.
* Create subfolder if it doesn't exist
* Contents persist across sessions and feed later commands from the same subfolder.

## Failure Handling

* Missing prerequisites or tool errors → explain & await resolution.
* Test failures → surface succinct diagnostics; enter discussion.

### Example Output Format (stored in `.scratchpad/<subfolder>/code.md`)

```markdown
# Coding Progress – Email Verification Feature

**Overview**
Implement backend logic for email verification, integrating new service, endpoint, and logging.

## Task Progress
- ✅ Add DB migration `20250612_add_verification.sql`
- ✅ Create `EmailVerificationService`
- 🔄 Integrate service into signup flow
- ❌ Remove temporary debug logs (`CLEANUP_REFACTOR`)

## Notes
- Observed log snippet `Invalid verification token` confirms error path.
- Temporary script `CLEANUP_REFACTOR_check_logs.sh` added for manual testing.
- User confirmed signup flow works in UI (see grep'd logs above).
```

---

*End of code.md specification*