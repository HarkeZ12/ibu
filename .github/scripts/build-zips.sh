#!/usr/bin/env bash
# Packs every "<code> - <name>/weekNN" and "<code> - <name>/assignment-NN" folder into
# "<Name>-Week-NN.zip" / "<Name>-Assignment-NN.zip" (spaces become dashes, because GitHub
# release asset names cannot contain spaces), and each course into "<Name>-Whole-course.zip".
# Inside each ZIP the folder is named like "Data Structures and Algorithms - Week 05".
# Output goes to the folder given as $1.
set -euo pipefail
out="$(realpath -m "${1:-dist}")"
mkdir -p "$out"
label() {
  case "$1" in
    week*) echo "Week ${1#week}" ;;
    assignment-*) echo "Assignment ${1#assignment-}" ;;
  esac
}
for course in *" - "*/; do
  course="${course%/}"
  name="${course#* - }"
  slug="${name// /-}"
  found=0
  for part in "$course"/week[0-9]*/ "$course"/assignment-[0-9]*/; do
    [ -d "$part" ] || continue
    part="$(basename "$part")"
    lab="$(label "$part")"
    zipname="$slug-${lab// /-}.zip"
    tmp="$(mktemp -d)"
    cp -r "$course/$part" "$tmp/$name - $lab"
    (cd "$tmp" && zip -qr "$out/$zipname" "$name - $lab")
    rm -rf "$tmp"
    echo "$zipname"
    found=1
  done
  if [ "$found" = 1 ]; then
    zip -qr "$out/$slug-Whole-course.zip" "$course"
    echo "$slug-Whole-course.zip"
  fi
done
