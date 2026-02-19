# Token-Efficient Test and Lint Commands Design

## Overview

Add `npm run test:brief` and `npm run lint:brief` commands that report only failures and warnings with minimal output, optimized for token efficiency when communicating with Claude.

## Design

### New npm Scripts

- **`npm run test:brief`**: Runs tests in CI mode (single-run) with filtering to show only failures/warnings

  - Executes: `ng test --no-watch --code-coverage --browsers ChromeHeadless`
  - Filters output to show: file names with failures/warnings, one per line, with total counts
  - Exit code: non-zero if there are failures (same as normal test)

- **`npm run lint:brief`**: Runs linting with filtering to show only errors/warnings
  - Executes: `ng lint`
  - Filters output to show: file names with errors/warnings, one per line, with total counts
  - Exit code: non-zero if there are errors (same as normal lint)

### Output Format

Minimal text format designed for token efficiency:

```
src/app/components/example.component.ts: 2 errors
src/app/services/example.service.ts: 1 warning
---
Total: 3 issues
```

### Implementation Approach

Create shell wrapper scripts in a new `scripts/` directory that:

1. Run the full Angular CLI commands
2. Parse/filter the output to extract only failures and warnings
3. Print a summary with file names and issue counts
4. Maintain proper exit codes for CI integration

### Documentation Updates

Update `CLAUDE.md` to recommend using these token-efficient commands:

- When running tests during development with Claude
- When running linting checks during development with Claude
- Keep full commands available for comprehensive output when needed

## Success Criteria

- ✅ New commands available via npm
- ✅ Output is significantly more token-efficient than full output
- ✅ Shows only failures/warnings with file names and counts
- ✅ Maintains proper exit codes for CI
- ✅ CLAUDE.md documents recommended usage
