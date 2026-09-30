#!/usr/bin/env bash
# API test suite: curl against a running backend backed by an EMPTY database
# (it registers fixed usernames). Reset first with: php tests/reset-db.php --yes
#
#   API_URL  backend base URL   (default http://localhost:8000/api; Herd: http://backend.test/api)
#   PHP      php binary, used to compare JSON and make upload fixtures (default: php on PATH)
#
# Prints PASS/FAIL per check; exits non-zero if anything fails.
B="${API_URL:-http://localhost:8000/api}"
B="${B%/}"
PHP="${PHP:-php}"
SCR="$(mktemp -d)"
trap 'rm -rf "$SCR"' EXIT
pass=0; fail=0
check() { # name expected_status actual_status body [grep_pattern]
  local name="$1" exp="$2" got="$3" body="$4" pat="$5"
  if [ "$got" = "$exp" ] && { [ -z "$pat" ] || echo "$body" | grep -qE -- "$pat"; }; then
    pass=$((pass+1)); echo "PASS  $name"
  else
    fail=$((fail+1)); echo "FAIL  $name  (status $got, want $exp) body: ${body:0:300}"
  fi
}
req() { # method path token body -> sets BODY, CODE
  local out
  # Bodies go through stdin: Windows argv would mangle emoji via the ANSI code page.
  local auth=(); [ -n "$3" ] && auth=(-H "Authorization: Bearer $3")
  if [ -n "$4" ]; then out=$(printf '%s' "$4" | curl -s -w $'\n%{http_code}' -X "$1" "$B/$2" "${auth[@]}" -H "Content-Type: application/json" --data-binary @-)
  else out=$(curl -s -w $'\n%{http_code}' -X "$1" "$B/$2" "${auth[@]}"); fi
  BODY=$(echo "$out" | sed '$d'); CODE=$(echo "$out" | tail -1)
}
tok() { echo "$1" | sed 's/.*"token":"\([^"]*\)".*/\1/'; }

# --- auth
req POST auth/register.php "" '{"username":"alice","email":"alice@x.io","password":"password1","display_name":"Alice"}'
check "register alice" 201 "$CODE" "$BODY" '"token"'; TA=$(tok "$BODY"); IDA=$(echo "$BODY" | sed 's/.*"user":{"id":\([0-9]*\).*/\1/')
req GET "users/suggestions.php" "$TA"
check "only user: no suggestions, has_other_users false" 200 "$CODE" "$BODY" '^\{"users":\[\],"has_other_users":false\}$'
req POST auth/register.php "" '{"username":"bob","email":"bob@x.io","password":"password1","display_name":"Bob"}'
check "register bob" 201 "$CODE" "$BODY"; TB=$(tok "$BODY"); IDB=$(echo "$BODY" | sed 's/.*"user":{"id":\([0-9]*\).*/\1/')
req POST auth/register.php "" '{"username":"ALICE","email":"other@x.io","password":"password1","display_name":"A2"}'
check "duplicate username (case-insensitive) -> 409" 409 "$CODE" "$BODY" '"error"'
req POST auth/register.php "" '{"username":"a!","email":"bad","password":"short","display_name":"x"}'
check "invalid username -> 400" 400 "$CODE" "$BODY" '"error"'
req POST auth/register.php "" '{"username":"carol"}'
check "missing fields -> 400" 400 "$CODE" "$BODY" 'Missing required'
req POST auth/login.php "" '{"email":"alice@x.io","password":"wrong"}'
check "bad password -> 401" 401 "$CODE" "$BODY" 'Invalid email or password'
req POST auth/login.php "" '{"email":"alice@x.io","password":"password1"}'
check "login" 200 "$CODE" "$BODY" '"token"'
req GET auth/login.php
check "wrong method -> 405" 405 "$CODE" "$BODY" '"error"'

# --- posts, including exact length limits with 4-byte emoji
req POST posts/create.php "" '{"content":"hi"}'
check "create post without token -> 401" 401 "$CODE" "$BODY"
req POST posts/create.php "garbage.token.x" '{"content":"hi"}'
check "create post bad token -> 401" 401 "$CODE" "$BODY"
req POST posts/create.php "$TB" '{"content":"Hello from Bob 🌊"}'
check "bob creates post (emoji)" 201 "$CODE" "$BODY" 'Hello from Bob \\ud83c\\udf0a'; PID=$(echo "$BODY" | sed 's/.*"post":{"id":\([0-9]*\).*/\1/')
EMOJI1000=$(printf '🌊%.0s' $(seq 1 1000))
req POST posts/create.php "$TB" "{\"content\":\"$EMOJI1000\"}"
check "1000 emoji post accepted (VARCHAR(1000) utf8mb4)" 201 "$CODE" "$BODY"
req POST posts/create.php "$TB" "{\"content\":\"${EMOJI1000}x\"}"
check "1001-char post -> 400" 400 "$CODE" "$BODY" '1000'
req POST posts/create.php "$TB" '{"content":"   "}'
check "whitespace post -> 400" 400 "$CODE" "$BODY"
for i in $(seq 1 22); do curl -s -o /dev/null -X POST $B/posts/create.php -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -d "{\"content\":\"bulk $i\"}"; done

# --- follow
req POST follow/toggle.php "$TA" "{\"user_id\":$IDB}"
check "alice follows bob" 200 "$CODE" "$BODY" '"following":true,"follower_count":1'
req POST follow/toggle.php "$TA" "{\"user_id\":$IDA}"
check "self-follow -> 400" 400 "$CODE" "$BODY" 'cannot follow yourself'
req POST follow/toggle.php "$TA" '{"user_id":999999}'
check "follow missing user -> 404" 404 "$CODE" "$BODY"

# --- feeds + pagination (bob has 24 posts)
req GET "posts/list.php?feed=home" "$TA"
check "home feed page 1: 20 posts, has_more" 200 "$CODE" "$BODY" '"has_more":true'
N1=$(echo "$BODY" | grep -o '"id":[0-9]*,"content"' | wc -l); [ "$N1" = 20 ] && echo "PASS  page 1 has 20 posts" || { echo "FAIL  page 1 has $N1 posts"; fail=$((fail+1)); }
req GET "posts/list.php?feed=home&page=2" "$TA"
check "home feed page 2: has_more false" 200 "$CODE" "$BODY" '"has_more":false'
N2=$(echo "$BODY" | grep -o '"id":[0-9]*,"content"' | wc -l); [ "$N2" = 4 ] && echo "PASS  page 2 has 4 posts" || { echo "FAIL  page 2 has $N2 posts"; fail=$((fail+1)); }
req GET "posts/list.php?feed=home"
check "home feed without token -> 401" 401 "$CODE" "$BODY"
req GET "posts/list.php?feed=user&user_id=$IDB"
check "user feed as guest" 200 "$CODE" "$BODY" '"liked_by_viewer":false'
req GET "posts/list.php?feed=user"
check "user feed without user_id -> 400" 400 "$CODE" "$BODY"
req GET "posts/list.php?feed=everything"
check "unknown feed -> 400" 400 "$CODE" "$BODY" "feed must be 'home', 'user' or 'all'"

# --- "For you": feed=all (everyone's posts, public). bob has 24 posts; alice adds 1.
req POST posts/create.php "$TA" '{"content":"alice for-you post"}'
check "alice posts" 201 "$CODE" "$BODY"; APID=$(echo "$BODY" | sed 's/.*"post":{"id":\([0-9]*\).*/\1/')
req GET "posts/list.php?feed=all"
check "feed=all as guest: 200, has_more" 200 "$CODE" "$BODY" '"has_more":true'
check "feed=all newest first (alice's new post leads)" 200 "$CODE" "$BODY" "^\\{\"posts\":\\[\\{\"id\":$APID,\"content\":\"alice for-you post\""
check "feed=all as guest: liked_by_viewer false" 200 "$CODE" "$BODY" '"liked_by_viewer":false'
NA1=$(echo "$BODY" | grep -o '"id":[0-9]*,"content"' | wc -l); [ "$NA1" = 20 ] && { echo "PASS  feed=all page 1 has 20 posts"; pass=$((pass+1)); } || { echo "FAIL  feed=all page 1 has $NA1 posts"; fail=$((fail+1)); }
req GET "posts/list.php?feed=all&page=2"
check "feed=all page 2: has_more false" 200 "$CODE" "$BODY" '"has_more":false'
NA2=$(echo "$BODY" | grep -o '"id":[0-9]*,"content"' | wc -l); [ "$NA2" = 5 ] && { echo "PASS  feed=all page 2 has 5 posts (25 total)"; pass=$((pass+1)); } || { echo "FAIL  feed=all page 2 has $NA2 posts"; fail=$((fail+1)); }
# Ordering across both pages: ids strictly descending, no duplicates.
curl -s "$B/posts/list.php?feed=all" > "$SCR/all1.json"; curl -s "$B/posts/list.php?feed=all&page=2" > "$SCR/all2.json"
ORDER=$("$PHP" -r '$ids = []; foreach (array_slice($argv, 1) as $f) foreach (json_decode(file_get_contents($f), true)["posts"] as $p) $ids[] = $p["id"];
  $sorted = $ids; rsort($sorted); echo (count($ids) === 25 && $ids === $sorted && count(array_unique($ids)) === 25) ? "ok" : "bad";' "$SCR/all1.json" "$SCR/all2.json")
[ "$ORDER" = ok ] && { echo "PASS  feed=all pages: 25 unique posts, newest first"; pass=$((pass+1)); } || { echo "FAIL  feed=all ordering/uniqueness"; fail=$((fail+1)); }
req GET "posts/list.php?feed=all" "$TB"
check "feed=all includes users the viewer doesn't follow (bob sees alice)" 200 "$CODE" "$BODY" "\"id\":$APID,\"content\":\"alice for-you post\""
req GET "posts/list.php?feed=home" "$TB"
HOMEHAS=$(echo "$BODY" | grep -c "\"id\":$APID,")
[ "$HOMEHAS" = 0 ] && { echo "PASS  feed=home still excludes unfollowed users (bob doesn't see alice)"; pass=$((pass+1)); } || { echo "FAIL  feed=home leaked alice's post to bob"; fail=$((fail+1)); }
req GET "posts/list.php?feed=all" "garbage.token.x"
check "feed=all with bad token still works (optional auth)" 200 "$CODE" "$BODY" '"posts":\[\{'

# --- likes, incl. two concurrent toggles
req POST likes/toggle.php "$TA" "{\"post_id\":$PID}"
check "like" 200 "$CODE" "$BODY" '"liked":true,"like_count":1'
req GET "posts/list.php?feed=all&page=2" "$TA"
check "feed=all: liked_by_viewer true for the liker" 200 "$CODE" "$BODY" "\"id\":$PID,[^}]*\"liked_by_viewer\":true"
req GET "posts/list.php?feed=user&user_id=$IDB&page=2" "$TA"
check "liked_by_viewer true in feed" 200 "$CODE" "$BODY" "\"id\":$PID,[^}]*\"liked_by_viewer\":true"
req POST likes/toggle.php "$TA" "{\"post_id\":$PID}"
check "unlike" 200 "$CODE" "$BODY" '"liked":false,"like_count":0'
req POST likes/toggle.php "$TA" '{"post_id":999999}'
check "like missing post -> 404" 404 "$CODE" "$BODY"
for i in 1 2; do curl -s -o /dev/null -X POST $B/likes/toggle.php -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -d "{\"post_id\":$PID}" & done; wait
LC=$(curl -s "$B/posts/list.php?feed=user&user_id=$IDB&page=2" | grep -o "\"id\":$PID,[^}]*" | grep -o '"like_count":[0-9]*')
echo "INFO  concurrent double-toggle left $LC (0 or 1 are both valid; never 2 or an error)"

# --- single post: posts/get.php
# The concurrent-toggle test above may leave bob liking PID; start from zero likes.
curl -s "$B/posts/get.php?id=$PID" -H "Authorization: Bearer $TB" | grep -q '"liked_by_viewer":true' && curl -s -o /dev/null -X POST $B/likes/toggle.php -H "Authorization: Bearer $TB" -H "Content-Type: application/json" --data-binary "{\"post_id\":$PID}"
# Same-shape check: get.php's post must equal that post's entry in list.php
# for the same viewer (compared as decoded JSON, key order included).
same_as_feed() { # token-or-empty label
  local auth=(); [ -n "$1" ] && auth=(-H "Authorization: Bearer $1")
  curl -s "${auth[@]}" "$B/posts/get.php?id=$PID" > "$SCR/get.json"
  curl -s "${auth[@]}" "$B/posts/list.php?feed=user&user_id=$IDB&page=2" > "$SCR/list.json"
  local r; r=$("$PHP" -r '$g = json_decode(file_get_contents($argv[1]), true)["post"];
    foreach (json_decode(file_get_contents($argv[2]), true)["posts"] as $p) if ($p["id"] === $g["id"]) { echo $p === $g ? "same" : "differs"; exit; }
    echo "missing";' "$SCR/get.json" "$SCR/list.json")
  [ "$r" = same ] && { echo "PASS  get.php post identical to feed item ($2)"; pass=$((pass+1)); } || { echo "FAIL  get.php vs feed item ($2): $r"; fail=$((fail+1)); }
}
req GET "posts/get.php?id=$PID"
check "get post as guest" 200 "$CODE" "$BODY" '^\{"post":\{"id":[0-9]+,"content":"Hello from Bob .*","image_url":null,"created_at":"[0-9-]+ [0-9:]+","like_count":0,"comment_count":0,"liked_by_viewer":false,"author":\{"id":[0-9]+,"username":"bob","display_name":"Bob","avatar_url":null\}\}\}$'
same_as_feed "" "guest"
curl -s -o /dev/null -X POST $B/likes/toggle.php -H "Authorization: Bearer $TA" -H "Content-Type: application/json" --data-binary "{\"post_id\":$PID}"
req GET "posts/get.php?id=$PID" "$TA"
check "get post as liker: liked_by_viewer true" 200 "$CODE" "$BODY" '"like_count":1,"comment_count":0,"liked_by_viewer":true'
same_as_feed "$TA" "logged-in liker"
req GET "posts/get.php?id=$PID" "$TB"
check "get post as another user: liked_by_viewer false" 200 "$CODE" "$BODY" '"like_count":1,"comment_count":0,"liked_by_viewer":false'
req GET "posts/get.php?id=$PID" "garbage.token.x"
check "get post with bad token still works (optional auth)" 200 "$CODE" "$BODY" '"liked_by_viewer":false'
curl -s -o /dev/null -X POST $B/likes/toggle.php -H "Authorization: Bearer $TA" -H "Content-Type: application/json" --data-binary "{\"post_id\":$PID}"
req GET "posts/get.php"
check "get post without id -> 400" 400 "$CODE" "$BODY" 'Post id is required'
req GET "posts/get.php?id=abc"
check "get post non-numeric id -> 400" 400 "$CODE" "$BODY" '"error"'
req GET "posts/get.php?id=-5"
check "get post negative id -> 400" 400 "$CODE" "$BODY" '"error"'
req GET "posts/get.php?id=999999"
check "get missing post -> 404" 404 "$CODE" "$BODY" 'Post not found'
req POST "posts/get.php?id=$PID" "$TA" '{}'
check "get post wrong method -> 405" 405 "$CODE" "$BODY"

# --- comments
EMOJI500=$(printf '💬%.0s' $(seq 1 500))
req POST comments/create.php "$TA" "{\"post_id\":$PID,\"content\":\"$EMOJI500\"}"
check "500 emoji comment accepted (VARCHAR(500))" 201 "$CODE" "$BODY"
req POST comments/create.php "$TA" "{\"post_id\":$PID,\"content\":\"${EMOJI500}x\"}"
check "501-char comment -> 400" 400 "$CODE" "$BODY"
req POST comments/create.php "$TA" "{\"post_id\":$PID,\"content\":\"Nice!\"}"
check "alice comments" 201 "$CODE" "$BODY" '"content":"Nice!"'; CID=$(echo "$BODY" | sed 's/.*"comment":{"id":\([0-9]*\).*/\1/')
req GET "comments/list.php?post_id=$PID"
check "list comments (oldest first)" 200 "$CODE" "$BODY" '"content":"Nice!"'
req DELETE "comments/delete.php?id=$CID" "$TB"
check "bob deletes alice's comment -> 403" 403 "$CODE" "$BODY"
req DELETE "comments/delete.php?id=$CID" "$TA"
check "alice deletes own comment" 200 "$CODE" "$BODY" '"deleted":true'
req DELETE "comments/delete.php?id=$CID" "$TA"
check "delete again -> 404" 404 "$CODE" "$BODY"

# --- profile, suggestions, followers
req GET "users/profile.php?username=bob" "$TA"
check "profile bob as alice" 200 "$CODE" "$BODY" '"post_count":24,"follower_count":1,"following_count":0,"is_following":true,"is_self":false'
req GET "users/profile.php?id=$IDA" "$TA"
check "own profile is_self" 200 "$CODE" "$BODY" '"is_self":true'
req GET "users/profile.php?username=nobody"
check "unknown profile -> 404" 404 "$CODE" "$BODY"
req PUT users/update_profile.php "$TA" '{"bio":"Hi from Accra 🇬🇭","display_name":"Alice A."}'
check "update profile" 200 "$CODE" "$BODY" '"id":[0-9]+,"username":"alice","display_name":"Alice A.","bio":"Hi from Accra \\ud83c\\uddec\\ud83c\\udded"'
req PUT users/update_profile.php "$TA" '{}'
check "empty update -> 400" 400 "$CODE" "$BODY"
req GET "users/suggestions.php" "$TB"
check "suggestions for bob include alice" 200 "$CODE" "$BODY" '"username":"alice"'
req GET "users/suggestions.php" "$TA"
check "suggestions for alice exclude followed bob; has_other_users true" 200 "$CODE" "$BODY" '^\{"users":\[\],"has_other_users":true\}$'
req GET "follow/followers.php?user_id=$IDB" "$TB"
check "bob's followers" 200 "$CODE" "$BODY" '"username":"alice"'
req GET "follow/followers.php?user_id=$IDA&type=following"
check "alice's following" 200 "$CODE" "$BODY" '"username":"bob"'
req GET "follow/followers.php?user_id=$IDA&type=nope"
check "bad type -> 400" 400 "$CODE" "$BODY"

# --- ownership + cascade on post delete
curl -s -o /dev/null -X POST $B/likes/toggle.php -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d "{\"post_id\":$PID}"
curl -s -o /dev/null -X POST $B/comments/create.php -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -d "{\"post_id\":$PID,\"content\":\"will cascade\"}"
req DELETE "posts/delete.php?id=$PID" "$TA"
check "alice deletes bob's post -> 403" 403 "$CODE" "$BODY"
req DELETE "posts/delete.php?id=$PID" "$TB"
check "bob deletes own post" 200 "$CODE" "$BODY" '"deleted":true'
req GET "comments/list.php?post_id=$PID"
check "comments gone with post -> 404" 404 "$CODE" "$BODY"
req GET "posts/get.php?id=$PID"
check "get deleted post -> 404" 404 "$CODE" "$BODY" 'Post not found'
req POST follow/toggle.php "$TA" "{\"user_id\":$IDB}"
check "unfollow" 200 "$CODE" "$BODY" '"following":false,"follower_count":0'

# --- image uploads: posts/upload_image.php and users/upload_avatar.php
FX="$SCR/fixtures"; mkdir -p "$FX"
"$PHP" "$(dirname "$0")/make-fixtures.php" "$FX" > /dev/null || { echo "FAIL  could not generate upload fixtures"; fail=$((fail+1)); }
SITE="${B%/api}"   # backend root
UP="${UPLOADS_DIR:-uploads}"   # folder the backend stores uploads in (tests: uploads-test)
# upload <endpoint> <token> <file>. JSON escapes "/" as "\/"; BODY has that
# undone so URL patterns below can use plain slashes.
upload() {
  local auth=(); [ -n "$2" ] && auth=(-H "Authorization: Bearer $2")
  local out; out=$(curl -s -w $'\n%{http_code}' -X POST "$B/$1" "${auth[@]}" -F "image=@$3")
  BODY=$(echo "$out" | sed '$d' | sed 's#\\/#/#g'); CODE=$(echo "$out" | tail -1)
}
url_of() { echo "$1" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p'; }

for ext in png jpg gif webp; do
  upload posts/upload_image.php "$TA" "$FX/real.$ext"
  check "upload real .$ext -> 201, random name, .$ext" 201 "$CODE" "$BODY" "\"url\":\"https?:.*/$UP/posts/[0-9a-f]{32}\\.$ext\""
done
upload posts/upload_image.php "$TA" "$FX/real.png"; U1=$(url_of "$BODY")
curl -s -D "$SCR/h.txt" -o "$SCR/served.png" "$U1"
if cmp -s "$SCR/served.png" "$FX/real.png" && grep -qi "^content-type: image/png" "$SCR/h.txt"; then
  echo "PASS  uploaded file is served back byte-for-byte as image/png"; pass=$((pass+1))
else echo "FAIL  uploaded file not served correctly from $U1"; fail=$((fail+1)); fi
upload posts/upload_image.php "$TA" "$FX/real.png"; U2=$(url_of "$BODY")
[ -n "$U1" ] && [ "$U1" != "$U2" ] && { echo "PASS  same file uploaded twice gets two different names"; pass=$((pass+1)); } || { echo "FAIL  duplicate upload reused a name ($U1)"; fail=$((fail+1)); }

# A real PNG named evil.php: the client's filename and extension must be
# ignored. (PHP also strips any directory part from upload filenames.)
cp "$FX/real.png" "$FX/evil.php"
upload posts/upload_image.php "$TA" "$FX/evil.php"
check "client filename evil.php ignored: saved under a random .png name" 201 "$CODE" "$BODY" "/$UP/posts/[0-9a-f]{32}\\.png\""
EVIL=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/evil.php"); EVIL2=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/$UP/evil.php")
[ "$EVIL" = 404 ] && [ "$EVIL2" = 404 ] && { echo "PASS  nothing written outside uploads/posts (evil.php: 404)"; pass=$((pass+1)); } || { echo "FAIL  evil.php reachable ($EVIL / $EVIL2)"; fail=$((fail+1)); }

upload posts/upload_image.php "$TA" "$FX/big-under-limit.png"
if [ "$CODE" = 413 ] && echo "$BODY" | grep -q 'maximum size is [0-4]'; then
  echo "FAIL  4.7 MB image rejected: the server's PHP upload_max_filesize is below 5 MB ($BODY). Raise it (see README)."; fail=$((fail+1))
else check "real 4.7 MB image (under the 5 MB limit) accepted" 201 "$CODE" "$BODY" '"url":'; fi
upload posts/upload_image.php "$TA" "$FX/too-large.png"
check "real image over 5 MB -> 413 with a clear message" 413 "$CODE" "$BODY" 'too large\. The maximum size is 5 MB\.'
upload posts/upload_image.php "$TA" "$FX/not-an-image.png"
check "text file named .png -> 415 (contents checked, not extension)" 415 "$CODE" "$BODY" "isn't a supported image"
upload posts/upload_image.php "$TA" "$FX/fake-header.png"
check "PNG header followed by junk -> 415 (full decode required)" 415 "$CODE" "$BODY" "isn't a supported image"
upload posts/upload_image.php "$TA" "$FX/drawing.svg"
check "SVG -> 415" 415 "$CODE" "$BODY" "isn't a supported image"
upload posts/upload_image.php "$TA" "$FX/polyglot.gif"
check "PHP script disguised as GIF -> 415" 415 "$CODE" "$BODY" "isn't a supported image"
upload posts/upload_image.php "$TA" "$FX/empty.png"
check "empty file -> 400" 400 "$CODE" "$BODY" 'empty'
upload posts/upload_image.php "" "$FX/real.png"
check "upload without login -> 401" 401 "$CODE" "$BODY"
OUT=$(curl -s -w $'\n%{http_code}' -X POST "$B/posts/upload_image.php" -H "Authorization: Bearer $TA" -F "photo=@$FX/real.png")
check "wrong form field -> 400" 400 "$(echo "$OUT" | tail -1)" "$(echo "$OUT" | sed '$d')" "field named 'image'"
req GET posts/upload_image.php "$TA"
check "upload with GET -> 405" 405 "$CODE" "$BODY"

req POST posts/create.php "$TA" "{\"content\":\"post with an uploaded image\",\"image_url\":\"$U1\"}"
check "create post with the uploaded image URL" 201 "$CODE" "$BODY" "\"image_url\":\"$(echo "$U1" | sed 's#/#\\\\/#g')\""

upload users/upload_avatar.php "$TA" "$FX/real.jpg"
check "avatar upload -> 201 under uploads/avatars" 201 "$CODE" "$BODY" "/$UP/avatars/[0-9a-f]{32}\\.jpg\""
AV=$(url_of "$BODY")
upload users/upload_avatar.php "$TA" "$FX/not-an-image.png"
check "avatar non-image -> 415" 415 "$CODE" "$BODY" "isn't a supported image"
upload users/upload_avatar.php "$TA" "$FX/too-large.png"
check "avatar over 5 MB -> 413" 413 "$CODE" "$BODY" 'maximum size is 5 MB'
req PUT users/update_profile.php "$TA" "{\"avatar_url\":\"$AV\"}"
check "save uploaded avatar via update_profile" 200 "$CODE" "$BODY" "\"avatar_url\":\"http[^\"]*$UP\\\\/avatars\\\\/[0-9a-f]{32}\\.jpg\""

# --- CORS
# The frontend origin the backend is configured to allow (run-all.sh sets CORS_ORIGINS).
ORIGIN="${CORS_ORIGINS:-http://127.0.0.1:5173}"; ORIGIN="${ORIGIN##*,}"
H=$(curl -s -D - -o /dev/null -X OPTIONS $B/posts/create.php -H "Origin: $ORIGIN")
echo "$H" | grep -q "204" && echo "$H" | grep -qi "Access-Control-Allow-Origin: $ORIGIN" && { echo "PASS  preflight $ORIGIN allowed"; pass=$((pass+1)); } || { echo "FAIL  preflight from $ORIGIN"; fail=$((fail+1)); }
H=$(curl -s -D - -o /dev/null "$B/comments/list.php?post_id=1" -H "Origin: https://evil.example")
echo "$H" | grep -qi "Access-Control-Allow-Origin" && { echo "FAIL  foreign origin echoed"; fail=$((fail+1)); } || { echo "PASS  foreign origin not allowed"; pass=$((pass+1)); }

echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
