#!/usr/bin/env bash
# Runs every suite, resetting the database before each one (they all assume an
# empty database). DESTRUCTIVE for the configured DB_NAME — see reset-db.php.
#
#   API_URL=http://backend.test/api PHP=php bash tests/run-all.sh
#
# Needs: the backend at API_URL, the Vite dev server at APP_URL (default
# http://localhost:5173) pointed at the same backend, and `npm install` in
# tests/e2e. Settings are described in api/run.sh and e2e/config.mjs.
set -u
cd "$(dirname "$0")"
PHP="${PHP:-php}"
export API_URL="${API_URL:-http://localhost:8000/api}" PHP

status=0
run() { # label command...
  echo; echo "=== $1"
  "$PHP" reset-db.php --yes >/dev/null || { echo "reset failed"; exit 1; }
  shift
  "$@" || status=1
}

run "API (curl)"          bash api/run.sh
run "Browser: member"     node e2e/member.mjs
run "Browser: guest"      node e2e/guest.mjs
run "Browser: post page"  node e2e/post.mjs
run "Browser: feed tabs"  node e2e/feed.mjs
run "Browser: smoke"      node e2e/smoke.mjs
run "Browser: logo"       node e2e/logo.mjs
run "Browser: uploads"    node e2e/upload.mjs

"$PHP" reset-db.php --yes >/dev/null
echo; [ "$status" -eq 0 ] && echo "ALL SUITES PASSED" || echo "SOME SUITES FAILED"
exit "$status"
