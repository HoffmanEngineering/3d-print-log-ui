# Token-Efficient Test and Lint Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `npm run test:brief` and `npm run lint:brief` commands that output only failures/warnings in a minimal format for token-efficient communication.

**Architecture:** Create shell wrapper scripts in `scripts/` directory that run the full test/lint commands and filter output to show only failures/warnings with counts. Update `package.json` to reference these scripts. Update `CLAUDE.md` to document when to use these commands.

**Tech Stack:** Bash shell scripts, npm scripts, Angular CLI (ng test, ng lint)

---

### Task 1: Create shell script directory structure

**Files:**

- Create: `scripts/test-brief.sh`
- Create: `scripts/lint-brief.sh`

**Step 1: Create scripts directory**

Run: `mkdir -p scripts`
Expected: Directory created (or already exists)

**Step 2: Create test-brief.sh script**

```bash
#!/bin/bash
# Run tests in CI mode and output only failures/warnings in minimal format

output=$(ng test --no-watch --code-coverage --browsers ChromeHeadless 2>&1)
exit_code=$?

# Extract only lines with failures/errors/warnings
failures=$(echo "$output" | grep -E "(FAILED|Error|✖)" | head -20)
summary=$(echo "$output" | grep -E "^[0-9]+ (passing|failing)" | tail -1)

if [ -n "$failures" ]; then
  echo "$failures"
  echo "---"
fi

echo "$summary"

exit $exit_code
```

**Step 3: Create lint-brief.sh script**

```bash
#!/bin/bash
# Run linting and output only errors/warnings in minimal format

output=$(ng lint 2>&1)
exit_code=$?

# Extract file names with error/warning counts
issues=$(echo "$output" | grep -E "^\s+[^ ].*\s(error|warning)" | sed 's/^[[:space:]]*//')

if [ -n "$issues" ]; then
  echo "$issues"
else
  if [ $exit_code -eq 0 ]; then
    echo "No linting issues found ✓"
  else
    echo "Linting completed with status $exit_code"
  fi
fi

exit $exit_code
```

**Step 4: Make scripts executable**

Run: `chmod +x scripts/test-brief.sh scripts/lint-brief.sh`
Expected: Scripts are now executable

**Step 5: Commit scripts**

```bash
git add scripts/test-brief.sh scripts/lint-brief.sh
git commit -m "feat: add shell scripts for token-efficient test and lint"
```

---

### Task 2: Update package.json with new npm scripts

**Files:**

- Modify: `package.json` (scripts section)

**Step 1: Add test:brief script to package.json**

In the `"scripts"` section, add after `"test:ci"`:

```json
"test:brief": "bash scripts/test-brief.sh",
```

**Step 2: Add lint:brief script to package.json**

In the `"scripts"` section, add after `"lint:fix"`:

```json
"lint:brief": "bash scripts/lint-brief.sh",
```

**Step 3: Verify package.json structure**

Run: `npm run`
Expected: Lists all scripts including new `test:brief` and `lint:brief`

**Step 4: Commit package.json**

```bash
git add package.json
git commit -m "feat: add test:brief and lint:brief npm scripts"
```

---

### Task 3: Test that the new commands work

**Files:**

- No new files

**Step 1: Run lint:brief to see output format**

Run: `npm run lint:brief`
Expected: Shows only files with errors/warnings, concise output

**Step 2: Run test:brief to see output format**

Run: `npm run test:brief`
Expected: Shows only test failures, concise output, reasonable token count

**Step 3: Verify exit codes**

Run: `npm run lint:brief; echo "Exit code: $?"`
Expected: Exit code 0 if no issues, non-zero if issues found

---

### Task 4: Update CLAUDE.md with documentation

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Read current CLAUDE.md**

Read the file to understand current structure (locate the "Commands" section)

**Step 2: Add brief commands to Commands section**

After the existing `npm run lint:fix` line, add:

```markdown
npm run test:brief # Token-efficient test output (CI mode, failures/warnings only)
npm run lint:brief # Token-efficient lint output (errors/warnings only)
```

**Step 3: Add new section "Token-Efficient Commands" under Commands**

```markdown
### Token-Efficient Commands

When communicating with Claude about test or lint failures, use these token-efficient variants to reduce output:

- **`npm run test:brief`** - Runs tests in CI mode with only failures/warnings displayed
- **`npm run lint:brief`** - Runs linting with only errors/warnings displayed

These commands are optimized for minimal token usage while preserving actionable information about failures and warnings.
```

**Step 4: Verify formatting looks correct**

Run: `cat CLAUDE.md | head -50`
Expected: New section visible and well-formatted

**Step 5: Commit CLAUDE.md**

```bash
git add CLAUDE.md
git commit -m "docs: document token-efficient test and lint commands"
```

---

### Task 5: Verify everything works together

**Files:**

- No modifications

**Step 1: Run both new commands**

Run: `npm run lint:brief && npm run test:brief`
Expected: Both commands work without errors, produce concise output

**Step 2: Check git status**

Run: `git status`
Expected: All changes committed, working tree clean

**Step 3: View commit log**

Run: `git log --oneline -4`
Expected: See the 3 new commits (scripts, package.json, CLAUDE.md)

---

## Success Criteria

- ✅ `npm run test:brief` works and outputs minimal test failures
- ✅ `npm run lint:brief` works and outputs minimal lint issues
- ✅ Both commands maintain proper exit codes
- ✅ Output is significantly more token-efficient than full output
- ✅ CLAUDE.md documents when to use these commands
- ✅ All changes committed
