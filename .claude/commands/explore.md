/project:explore — explore codebase. `/project:explore [exploration focus]`

# EXPLORE Command

> **Never modify code.** This command is strictly for understanding and documenting the existing codebase.

---

## Purpose

Provide a structured, repeatable workflow for Claude to investigate the codebase and gather all context needed for later commands (plan → code → refactor → commit).

## STRICT RULES
- **NEVER** edit or modify any code files
- **MUST** save/overwrite `.scratchpad/<subfolder>/explore.md` before each approval prompt
- **MUST** continue the revision loop until user explicitly types "approve"
- **MUST** ask clarifying questions one at a time, not in batches
- **MUST** always start by asking which files/folders to explore
- **MUST** return to earlier workflow steps if needed based on user feedback

## Preconditions

* None—this is the first command in the series.
* **MUST** prompt for subfolder name before starting exploration. Assume it for yourself using a [name-details] format with less than 3 words if you have a good idea of what the user is aiming for.
* If `.scratchpad/<subfolder>/explore.md` already exists, load its contents into context before asking the user anything.

## Accepted Arguments

`ARGUMENTS:` Free-form text that supplies extra instructions, questions, or context for this exploration run.

### Example ARGUMENTS Usage
- `/project:explore Focus on authentication flow and user management`
- `/project:explore Understand how the payment processing works`
- `/project:explore Map out the API endpoints and their database interactions`

## High-Level Workflow

1. **Kick-off:** Ask the user →
   *"What subfolder name should I use for this exploration? (e.g., 'add-integration-test', 'fix-auth-bug')"*
   Then ask: *"Which files and folders should I start exploring?"*
2. **Clarify:** Pose any immediate clarifying questions (one at a time). Wait for answers.
3. **Investigate:** For each supplied path:
   * Read code, trace key data/control flows, note existing log statements.
   * Identify functions/components relevant to the stated purpose.
   * Keep a running list of anything missing that will need to be built.
4. **Iterative Q&A Loop:** If more information is required, keep asking single, specific questions until satisfied.
   - **MUST** return to this loop if exploration report is not approved
   - Continue gathering information based on user feedback
5. **Draft report:** When confident, write a markdown report with these sections:
   * **Overview** – 1-paragraph summary of the exploration goal.
   * **Relevant Files** – list/table with rationale.
   * **Relevant Functions / Components** – brief descriptions.
   * **How the Code Works** – explanation of the current implementation's data flow, key operations, and dependencies.
   * **Manual Testing Requirements** – specific questions to ask the user about testing scenarios, expected behaviors, and areas needing manual verification.
   * **Missing Pieces** – items that don't exist yet but will be needed.
   * **Logging Notes** – existing log lines worth monitoring + suggested additions.
6. **Persist & Prompt:** Save the draft to `.scratchpad/<subfolder>/explore.md`, overwriting any prior version. Show the draft to the user and ask:
   *"Please review. Reply **approve** when happy, or send feedback/questions to iterate."*
7. **Revision Loop:** While the user does anything except reply `approve`, incorporate feedback, overwrite `.scratchpad/<subfolder>/explore.md`, and ask for approval again.
   - **MUST** return to Q&A loop (step 4) if more investigation is needed
   - **MUST** update the exploration report based on feedback
   - **MUST** continue this loop indefinitely until "approve" is received
8. **Exit:** When the user replies exactly `approve`:
   - Say "Exploration complete! The report has been saved to `.scratchpad/<subfolder>/explore.md`. Use `/project:plan` when ready to create an implementation plan."
   - **MUST** end the command completely and wait for next user instruction
   - **NEVER** automatically continue to planning or any other action

## Scratchpad Behaviour

* Path: `.scratchpad/<subfolder>/explore.md`
* Create subfolder if it doesn't exist
* Always overwrite with the latest draft before each approval prompt.
* Later commands (plan, code, refactor, commit) will read this file from the same subfolder.

## Failure Handling

If files are inaccessible or paths are wrong:

1. Inform the user.
2. Ask for corrected paths.
3. Retry exploration once resolved.

---

### Example Output Format

```markdown
# Exploration Report – <Purpose or Ticket>

**Overview**  
<One-paragraph explanation of why this exploration was done and its key findings.>

## Relevant Files
| File | Why It Matters |
|------|----------------|
| src/app/main.py | Application entry point; wires the HTTP server |
| src/services/user_service.py | Core business logic for user accounts |
| tests/test_user_flows.py | Regression tests that cover the affected areas |

## Relevant Functions / Components
- `create_user(email: str, password: str)`: Adds a new user to the database and publishes a `USER_CREATED` event.
- `AuthMiddleware`: Verifies JWTs on incoming requests.

## How the Code Works
The current implementation follows a typical MVC pattern:
1. HTTP requests arrive at `main.py` and are routed to appropriate handlers
2. The `AuthMiddleware` validates JWT tokens before allowing access to protected endpoints
3. `user_service.py` handles business logic, interacting with the database through SQLAlchemy models
4. Events are published to a message queue for async processing
5. Response data is serialized back to JSON and returned to the client

## Manual Testing Requirements
During the planning phase, we should ask the user to:
1. **Authentication Flow**: Can you test a login attempt and share the logs? What happens when invalid credentials are provided?
2. **Error Scenarios**: What error messages appear in the UI when the service is down?
3. **Performance**: How long does a typical user creation take in production?
4. **Edge Cases**: Are there any specific user types or permissions that behave differently?
5. **Integration Points**: Which external services should be mocked vs tested against real endpoints?

## Missing Pieces
- [ ] Email verification microservice
- [ ] DB migration to add `last_login_at` column

## Logging Notes
- Existing: `logger.info("User %s created", user_id)` inside `user_service.py`
- Suggested: `logger.debug("Attempting login for %s", email)` inside `auth.py`
```

---

*End of explore.md specification*