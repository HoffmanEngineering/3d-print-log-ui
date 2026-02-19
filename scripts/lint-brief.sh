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
