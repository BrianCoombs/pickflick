/project:plan — implementation plan. `/project:plan [planning focus]`

# PLAN Command

> **Never modify code.** This command designs *how* to implement, not the code itself.

---

## Purpose

Transform exploration findings into a concrete, actionable implementation plan ready for the **code** phase.

## STRICT RULES
- **NEVER** edit or modify any code files
- **MUST** prompt for subfolder name before starting (can offer up folder name options to choose from within .scratchpad/) If there is only 1 subfolder or there is a subfolder with just explore done you can assume that one. You can also reference prior context in the conversation.
- **MUST** check for `.scratchpad/<subfolder>/explore.md` and exit if missing
- **MUST** save/overwrite `.scratchpad/<subfolder>/plan.md` before each approval prompt
- **MUST** continue the revision loop until user explicitly types "approve"
- **MUST** ask clarifying questions one at a time
- **MUST** return to earlier workflow steps if needed based on user feedback
- **MUST** summarize log findings, never show raw command syntax or full logs

## Preconditions

1. **MUST** prompt for subfolder name before starting planning
2. `.scratchpad/<subfolder>/explore.md` **must exist**. If absent → inform the user to run `/project:explore` first and exit.
3. If `.scratchpad/<subfolder>/plan.md` exists, load it for continuity (enables incremental planning).

## Accepted Arguments

`ARGUMENTS:` Free-form notes or extra instructions that influence this planning session.

### Example ARGUMENTS Usage
- `/project:plan Prioritize security and error handling`
- `/project:plan Include comprehensive logging for debugging`
- `/project:plan Focus on performance optimization strategies`

## High-Level Workflow

1. **Kick-off:** Ask the user →
   *"What subfolder name should I use for this plan? (same as exploration subfolder)"*

2. **Load Context**
   * Read `.scratchpad/<subfolder>/explore.md` (and existing `plan.md` if present).

3. **Clarify Unknowns**
   * Ask targeted questions one-by-one until confident.
   * Common prompt: *"Please trigger action X in the UI so I can examine its logs. Reply **done** when finished."*

4. **Investigate Logs (optional)**
   * After user replies **done**, automatically run `docker logs <container> | grep -i "<keyword-or-phrase>"`
   * Capture and summarize the matching snippets (never show full logs or command syntax)
   * Ask any follow-up questions as needed
   * **MUST** return to this step if plan is not approved and more log investigation is needed

5. **Draft Plan**
   * Create a markdown plan (see *Example Output*). Include:
     * **Overview** – summary of the task/goal.
     * **Checklist** – ordered steps to implement.
     * **Existing Components/Functions to Leverage**.
     * **New Components/Functions to Add** (brief spec per item).
     * **Logging Enhancements** – where & what to log.
     * **Tests** – scripts or manual checks to validate changes.

6. **Persist & Prompt**
   * Save draft to `.scratchpad/<subfolder>/plan.md`, overwriting previous version.
   * Show the draft and ask: *"Please review. Reply **approve** when satisfied—or give feedback to iterate."*

7. **Revision Loop**
   * While user response ≠ `approve`, refine the plan, overwrite `.scratchpad/<subfolder>/plan.md`, and ask for approval again.
   * **MUST** return to Clarify Unknowns (step 3) or Investigate Logs (step 4) if more information is needed
   * **MUST** continue this loop indefinitely until "approve" is received

8. **Exit**
   * When the user replies exactly `approve`:
   * Say "Plan complete! The implementation plan has been saved to `.scratchpad/<subfolder>/plan.md`. Use `/project:code` when ready to start implementation."
   * **MUST** end the command completely and wait for next user instruction
   * **NEVER** automatically continue to coding or any other action

## Scratchpad Behaviour

* **Path:** `.scratchpad/<subfolder>/plan.md` (updated every approval cycle).
* Create subfolder if it doesn't exist
* Future commands (**code**, **refactor**, **commit**) will load this file from the same subfolder.

## Failure Handling

* If prerequisite files are missing → notify user & exit.
* If paths/logs inaccessible → explain issue, ask user for corrected info.

### Example Output Format

```markdown
# Implementation Plan – <Feature / Bug Fix>

**Overview**  
<One-paragraph goal statement>

## Checklist
- [ ] Step 1 – update routing in `api_router.py`
- [ ] Step 2 – create `EmailVerificationService`
- [ ] Step 3 – add DB migration `20250612_add_last_login.sql`

## Existing Components / Functions to Use
| Component | Location | How It Helps |
|-----------|----------|--------------|
| `UserService` | `src/services/user_service.py` | Central user logic; extend for new flag |
| `send_email` | `src/utils/email.py` | Re-use to deliver verification links |

## New Components / Functions to Add
- `EmailVerificationService` – handles token generation + link dispatch.
- `verify_email(token: str)` endpoint – validates token & activates user.

## Logging Enhancements
- `logger.info("Verification email sent", user_id)` in service layer.
- `logger.warning("Invalid verification token", token)` in handler.

## Tests / Validation
- Script `tests/manual/verify_email_flow.sh` to perform end-to-end signup.
- Ask user to verify email creation in the ui and check the logs for new info/warning lines
```

---

*End of plan.md specification*