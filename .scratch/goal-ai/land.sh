#!/usr/bin/env bash
# usage: land.sh NN "<title>" "<landed note>" path...  — marks ticket NN done, updates map, commits ticket+map+paths
set -e
NN=$1; TITLE=$2; NOTE=$3; shift 3; RUN=${RUN:?}; cd "$(dirname "$0")/../.."
T=$(ls .scratch/goal-ai/issues/${NN}-*.md)
sed -i '' "s|^Status: claimed .*|Status: done|" "$T"
printf '\n## Landed\n\nRun %s. %s\n' "$RUN" "$NOTE" >> "$T"
sed -i '' "s#^| $NN | \(.*\) | claimed $RUN |#| $NN | \1 | done |#" .scratch/goal-ai/map.md
grep -rIl 'onlyfans.com''/' "$T" .scratch/goal-ai/map.md "$@" && { echo SCRUB HIT; exit 1; }
git add -- "$T" .scratch/goal-ai/map.md "$@"
git commit -q -m "feat(goal-ai): $TITLE

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -- "$T" .scratch/goal-ai/map.md "$@"
git log --format='%h %s' -1; git status --porcelain
