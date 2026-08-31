#!/bin/bash
# Run tests in CI mode and output only failures/warnings in minimal format

output=$(ng test --no-watch --code-coverage --browsers ChromeHeadless 2>&1)
exit_code=$?

# Extract only lines with failures/errors/warnings
failures=$(echo "$output" | grep -E "(FAILED|Error|✖)" | head -20)
summary=$(echo "$output" | grep -E "^TOTAL:" | tail -1)

if [ -n "$failures" ]; then
  echo "$failures"
  echo "---"
fi

echo "$summary"

# Say the verdict in the output, not only in the exit code.
#
# This script exists to be piped — AGENTS.md points at it as the low-token way
# to read a test run — and a shell pipeline reports the exit status of its LAST
# command, so `npm run test:brief | tail` throws this away and a failed run
# reads as a success. A compile error makes that worse: Karma never reaches a
# TOTAL line, so the summary above is empty and the output carries no verdict
# at all. One line of stdout survives the pipe.
if [ "$exit_code" -ne 0 ]; then
  echo "RESULT: FAILED (ng test exited $exit_code)"
else
  echo "RESULT: PASSED"
fi

exit $exit_code
