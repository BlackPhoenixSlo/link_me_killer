#!/usr/bin/env bash
# usage: claim.sh NN  — claims ticket NN for run id $RUN and commits (path-limited)
set -e
NN=$1; RUN=${RUN:?}; cd "$(dirname "$0")/../.."
T=$(ls .scratch/goal-ai/issues/${NN}-*.md)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
grep -q '^Status: ready-for-agent' "$T" || { echo "not ready: $(grep '^Status' "$T")"; exit 1; }
sed -i '' "s|^Status: ready-for-agent|Status: claimed $RUN $NOW|" "$T"
sed -i '' "s#^| $NN | \(.*\) | ready-for-agent |#| $NN | \1 | claimed $RUN |#" .scratch/goal-ai/map.md
grep -rIl 'onlyfans.com''/' "$T" .scratch/goal-ai/map.md && { echo SCRUB HIT; exit 1; }
git add -- "$T" .scratch/goal-ai/map.md
git commit -q -m "docs(goal-ai): claim ticket $NN

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -- "$T" .scratch/goal-ai/map.md
git log --format='%h %s' -1; echo "$T"; sed -n '1,6p' "$T"
