#!/usr/bin/env bash
# Two-pass loudness normalisation to Apple's measured median: -17 LUFS integrated, -2 dBTP.
# Video is copied untouched.   scripts/master.sh in.mp4 out.mp4
set -euo pipefail
in="$1"; out="$2"
stats=$(ffmpeg -hide_banner -i "$in" -af loudnorm=I=-17:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | grep "\"$1\"" | sed -E 's/.*: "([^"]+)".*/\1/'; }
ffmpeg -hide_banner -loglevel error -y -i "$in" -c:v copy -c:a aac -b:a 256k \
  -af "loudnorm=I=-17:TP=-2:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  "$out"
echo "mastered -> $out"
