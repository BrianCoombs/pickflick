/project\:commit — create git commit. `/project:commit [commit instructions]`

# COMMIT Command

> **Generate & confirm a commit message, then commit changes.**

---

## Purpose

Package all completed work into a single git commit, based on the latest implementation or refactor scratchpad.

## STRICT RULES
- **MUST** check for prerequisite scratchpad files before proceeding
- **MUST** show exact files and commit message for user confirmation
- **MUST** exit immediately if prerequisites are missing
- **MUST** use ARGUMENTS to customize commit message if provided
- **NEVER** commit without explicit "yes" confirmation

## Preconditions

1. At least one of these must exist:
   * `.scratchpad/refactor.md`
   * `.scratchpad/code.md`
2. If neither exists → print an informative message and exit.
3. If both exist → use **refactor.md** as the authoritative source.

## Accepted Arguments

`ARGUMENTS:` Optional instructions for customizing the commit message. If provided, these override or supplement the auto-generated message from scratchpad content.

### Example ARGUMENTS Usage
- `/project:commit feat: add email verification with tests`
- `/project:commit fix: resolve race condition in user signup`
- `/project:commit Include migration notes in commit body`

## High-Level Workflow

1. **Select Context**
   * Prefer `.scratchpad/refactor.md`; otherwise `.scratchpad/code.md`.

2. **Generate Commit Message**
   * If ARGUMENTS provided: Use them as primary guidance for the message
   * Otherwise: Parse the chosen markdown to craft a concise, imperative commit message (max ~72-char summary + body bullets)
   * Always incorporate key changes from scratchpad even when ARGUMENTS are used

3. **Gather File List**

   * Run `git status --porcelain` to collect changed/added files.
4. **Confirm with User**

   * Display:

     * List of files to be committed.
     * Proposed commit message.
   * Ask: *"Commit these changes? (yes/no)"*
5. **Act on Response**

   * **yes** → execute:

     ```bash
     git add <listed files>
     git commit -m "<commit summary>" -m "<commit body>"
     ```

     Then say "Commit successful! Changes have been committed to git."
     * **MUST** end the command completely and wait for next user instruction
     * **NEVER** automatically continue to push, create PR, or any other action
   * **no / any other input** → say "Commit cancelled. No changes were made."
     * **MUST** end the command completely and wait for next user instruction

## Failure Handling

* If git returns an error (e.g., conflicts, nothing to commit), surface the message and exit.

### Example Confirmation Prompt

```text
Files to commit (3):
  M src/services/email_verification.py
  A src/migrations/20250612_add_verification.sql
  M api_router.py

Proposed commit message:
Email verification feature completed

* Added EmailVerificationService and endpoint.
* DB migration for verification_token.
* Updated routing & tests. Marked temp scripts with CLEANUP_REFACTOR.

Commit these changes? (yes/no)
```

---

*End of commit.md specification*
