#!/usr/bin/env bash
# Runs every suite against an ISOLATED copy of the app, so tests never touch
# the real database or uploaded files:
#
#   - its own database:      codealpha_social_test  (reset before each suite)
#   - its own uploads:       backend/uploads-test/
#   - its own PHP backend:   http://127.0.0.1:8090   (php -S, started here)
#   - its own Vite frontend: http://localhost:5199   (started here, pointed at 8090,
#                            with its own dependency cache; see vite.test.config.mjs)
#
# Your normal site (e.g. Herd at backend.test + your own Vite dev servers) and its
# database are left alone; this script never stops a process it didn't start.
# reset-db.php refuses to touch any database not named *_test.
#
#   PHP=php bash tests/run-all.sh
#
# Needs: npm install in frontend/ and tests/e2e/, and MySQL credentials in
# backend/config/local.php (the same ones the app uses).
set -u
cd "$(dirname "$0")"
PHP="${PHP:-php}"
API_PORT="${TEST_API_PORT:-8090}"
APP_PORT="${TEST_APP_PORT:-5199}"
export TEST_APP_PORT="$APP_PORT"

# Everything below (reset-db.php, the backend, the suites) reads these.
export DB_NAME=codealpha_social_test
export UPLOADS_DIR=uploads-test
export CORS_ORIGINS="http://localhost:$APP_PORT,http://127.0.0.1:$APP_PORT"
export API_URL="http://127.0.0.1:$API_PORT/api"
export APP_URL="http://localhost:$APP_PORT"
export PHP

LOGS="$(mktemp -d)"
PIDS=()
# Stops only the processes started below. On Windows (Git Bash) a plain kill
# doesn't reach native programs, so use taskkill on their Windows PID there.
cleanup() {
  for pid in "${PIDS[@]}"; do
    winpid=$(cat "/proc/$pid/winpid" 2>/dev/null)
    if [ -n "$winpid" ] && command -v taskkill >/dev/null; then taskkill //F //T //PID "$winpid" >/dev/null 2>&1
    else kill "$pid" 2>/dev/null; fi
  done
  wait 2>/dev/null
}
trap cleanup EXIT

# Vite listens on "localhost", which may be IPv6 only, so check both.
port_in_use() {
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/" || curl -s -o /dev/null --max-time 2 "http://localhost:$1/"
}
wait_for() { # url label
  for _ in $(seq 1 60); do
    curl -s -o /dev/null --max-time 2 "$1" && return 0
    sleep 0.5
  done
  echo "$2 did not start; see $LOGS"; exit 1
}

for port in "$API_PORT" "$APP_PORT"; do
  if port_in_use "$port"; then
    echo "Port $port is already in use. Stop whatever is running there (or set TEST_API_PORT / TEST_APP_PORT) and retry."
    exit 1
  fi
done

# Fresh test database before starting the backend (also proves the guards pass).
"$PHP" reset-db.php --yes || { echo "reset failed"; exit 1; }

echo "Starting test backend on :$API_PORT and test frontend on :$APP_PORT (logs: $LOGS)"
# php -S ignores backend/.user.ini, so pass the upload limits here.
"$PHP" -d upload_max_filesize=6M -d post_max_size=8M -S "127.0.0.1:$API_PORT" -t ../backend > "$LOGS/backend.log" 2>&1 &
PIDS+=($!)
# VITE_API_URL from the environment overrides frontend/.env (which points at Herd).
VITE_API_URL="$API_URL" node ../frontend/node_modules/vite/bin/vite.js ../frontend --config vite.test.config.mjs > "$LOGS/frontend.log" 2>&1 &
PIDS+=($!)
wait_for "$API_URL/posts/list.php?feed=all" "Test backend"
wait_for "$APP_URL/" "Test frontend"

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
run "Browser: regressions" node e2e/regressions.mjs
run "Browser: post actions" node e2e/actions.mjs
run "Browser: composer"   node e2e/composer.mjs

"$PHP" reset-db.php --yes >/dev/null
echo; [ "$status" -eq 0 ] && echo "ALL SUITES PASSED" || echo "SOME SUITES FAILED"
exit "$status"
