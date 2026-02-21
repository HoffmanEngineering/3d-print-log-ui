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

exit $exit_code
