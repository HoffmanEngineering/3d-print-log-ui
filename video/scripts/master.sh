#!/usr/bin/env bash
# Masters the render's audio to Apple's measured median: -17 LUFS integrated, under -2 dBTP.
# Video is copied untouched.   scripts/master.sh in.mp4 out.mp4
#
# loudnorm alone undershoots on a sparse SFX track (long near-silences), so: one loudnorm
# pass to tame peaks and get close, then a measured gain trim onto the target.
set -euo pipefail
in="$1"; out="$2"; target=-17
tmp="$(mktemp --suffix=.wav)"; trap 'rm -f "$tmp"' EXIT
ffmpeg -hide_banner -loglevel error -y -i "$in" -vn -af "loudnorm=I=$target:TP=-3:LRA=11" -ar 48000 "$tmp"
measured=$(ffmpeg -hide_banner -i "$tmp" -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | sed -n 's/.*I: *\(-\?[0-9.]*\) LUFS.*/\1/p' | tail -1)
gain=$(awk -v t="$target" -v m="$measured" 'BEGIN { printf "%.2f", t - m }')
ffmpeg -hide_banner -loglevel error -y -i "$in" -i "$tmp" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -af "volume=${gain}dB,alimiter=limit=0.79:level=false" "$out"
echo "mastered -> $out (measured ${measured} LUFS, trim ${gain} dB)"
