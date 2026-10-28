#!/usr/bin/env bash
# Packs every "<code> - <name>/weekNN" folder into <code>-weekNN.zip,
# and each course into <code>-all.zip. Output goes to the folder given as $1.
set -euo pipefail
out="$(realpath -m "${1:-dist}")"
mkdir -p "$out"
for course in *" - "*/; do
  course="${course%/}"
  code="${course%% - *}"
  slug="${code// /-}"
  found=0
  for week in "$course"/week[0-9]*/; do
    [ -d "$week" ] || continue
    week="$(basename "$week")"
    (cd "$course" && zip -qr "$out/$slug-$week.zip" "$week")
    echo "$slug-$week.zip"
    found=1
  done
  if [ "$found" = 1 ]; then
    zip -qr "$out/$slug-all.zip" "$course"
    echo "$slug-all.zip"
  fi
done
