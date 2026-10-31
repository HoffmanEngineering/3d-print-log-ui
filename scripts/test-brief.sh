#!/bin/bash
# Run tests in CI mode and output only failures/warnings in minimal format

# pipefail inside the substitution, so its status is ng test's, not sed's.
output=$(set -o pipefail; ng test --no-watch 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
exit_code=$?

# Extract only failing tests, errors and build errors
failures=$(echo "$output" | grep -E "^ FAIL |^[A-Za-z]*Error:|✘ \[ERROR\]" | head -20)
summary=$(echo "$output" | grep -E "^ +(Test Files|Tests) " | tail -2)

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
# reads as a success. A compile error makes that worse: Vitest never runs, so
# the summary above is empty and the output carries no verdict at all. One line
# of stdout survives the pipe.
if [ "$exit_code" -ne 0 ]; then
  echo "RESULT: FAILED (ng test exited $exit_code)"
else
  echo "RESULT: PASSED"
fi

exit $exit_code
