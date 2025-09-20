/project:linear — save scratchpad to Linear ticket. `/project:linear [ticket-id]`

# LINEAR Command

> **Save all scratchpad files as comments to a Linear ticket and update its status.**

---

## Purpose

Upload the current scratchpad files (explore.md, plan.md, code.md, refactor.md) as individual comments to a specified Linear ticket, then optionally update the ticket status to Done.

## STRICT RULES
- **MUST** check for at least one scratchpad file before proceeding
- **MUST** ask for ticket ID if not provided in ARGUMENTS
- **MUST** validate ticket ID format (e.g., TW-123, CURVE-456)
- **MUST** show which files will be uploaded before proceeding
- **MUST** wait for explicit confirmation before uploading
- **MUST** ask about status update separately after upload
- **NEVER** modify the scratchpad files during this process
- **MUST** use MCP Linear tools for all operations

## Preconditions

1. At least one of these must exist:
   * `.scratchpad/explore.md`
   * `.scratchpad/plan.md`
   * `.scratchpad/code.md`
   * `.scratchpad/refactor.md`
2. If none exist → inform user no scratchpad files found and exit.
3. Linear MCP server must be connected and available.

## Accepted Arguments

`ARGUMENTS:` Optional Linear ticket ID (e.g., TW-123, CURVE-456). If not provided, the command will prompt for it.

### Example ARGUMENTS Usage
- `/project:linear TW-123`
- `/project:linear CURVE-456`
- `/project:linear` (will prompt for ID)

## High-Level Workflow

1. **Check Prerequisites**
   * Scan for existing scratchpad files in `.scratchpad/`
   * If none found → exit with message
   * Check if Linear MCP tools are available (look for mcp_linear_* tools)

2. **Get Ticket ID**
   * If provided in ARGUMENTS → validate format
   * Otherwise → prompt: *"What is the Linear ticket ID? (e.g., TW-123)"*
   * Validate the ID matches pattern (letters-numbers)

3. **List Files**
   * Show all scratchpad files found with their sizes
   * Display order in which they'll be uploaded (explore → plan → code → refactor)

4. **Confirm Upload**
   * Ask: *"Upload these scratchpad files to Linear ticket {ticket_id}? (yes/no)"*

5. **Upload Files**
   * If user confirms with **yes**:
     - For each scratchpad file in order:
       - Read file contents
       - Format as markdown comment with header
       - Use MCP Linear tool to create comment on ticket
       - Show progress for each file uploaded
   * If **no** → say "Upload cancelled. No changes were made." and exit

6. **Update Status (Optional)**
   * After successful upload, ask: *"Update ticket status to Done? (yes/no)"*
   * If **yes** → use MCP Linear tool to update ticket status
   * If **no** → skip status update

7. **Exit**
   * Show summary of actions taken
   * **MUST** end the command completely and wait for next user instruction

## MCP Tool Usage

### Expected MCP Tools
- `mcp_linear_create_comment` or similar for adding comments
- `mcp_linear_update_issue` or similar for updating ticket status
- `mcp_linear_get_issue` (optional) for verifying ticket exists

### Comment Format
Each scratchpad file will be posted as a separate comment with this format:
```markdown
## 📄 {filename}
---
{file contents}
---
*Uploaded from Claude Code scratchpad on {timestamp}*
```

## Failure Handling

* MCP tools not available → inform user to connect Linear MCP server
* Invalid ticket ID → ask for corrected ID
* API errors → surface error message and suggest checking ticket permissions
* File read errors → skip that file and continue with others
* Status update fails → inform user but don't fail the entire operation

### Example Confirmation Prompt

```text
Found scratchpad files to upload:
  📄 .scratchpad/explore.md (2.3 KB)
  📄 .scratchpad/plan.md (1.8 KB) 
  📄 .scratchpad/code.md (3.1 KB)

These files will be uploaded as separate comments to Linear ticket TW-123.

Upload these scratchpad files to Linear ticket TW-123? (yes/no)
```

### Example Progress Output

```text
Uploading scratchpad files to TW-123...
  ✅ Uploaded explore.md
  ✅ Uploaded plan.md
  ✅ Uploaded code.md

Successfully uploaded 3 scratchpad files!

Update ticket status to Done? (yes/no)
> yes

✅ Updated TW-123 status to Done

Summary:
- Uploaded 3 scratchpad files to TW-123
- Updated ticket status to Done
```

---

*End of linear.md specification*