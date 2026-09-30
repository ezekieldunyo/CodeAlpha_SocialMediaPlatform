<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/posts.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

$feed = $_GET['feed'] ?? 'home';           // 'home', 'user' or 'all'
$targetUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : null;
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;
$offset = ($page - 1) * $perPage;

if (!in_array($feed, ['home', 'user', 'all'], true)) {
    jsonError(400, "feed must be 'home', 'user' or 'all'.");
}

$viewerId = optionalAuth();
$pdo = getDbConnection();

// A feed is a list of entries: posts, and (home and "For you") reposts. Each
// entry has the post it shows, when it entered the feed (the post's or the
// repost's created_at) and, for a repost, who reposted it.
$postEntries = 'SELECT p.id AS post_id, p.created_at AS sort_time, NULL AS reposter_id, 0 AS is_repost, p.id AS entry_id
    FROM posts p';
$repostEntries = 'SELECT r.post_id, r.created_at, r.user_id, 1, r.id
    FROM reposts r';

if ($feed === 'all') {
    // "For you": everyone's posts and reposts, newest first. Public, like profile feeds.
    $entries = "$postEntries UNION ALL $repostEntries";
    $params = [];
} elseif ($feed === 'user') {
    // A profile: that user's own posts only.
    if (!$targetUserId) {
        jsonError(400, 'user_id is required when feed=user.');
    }
    $entries = "$postEntries WHERE p.user_id = :target";
    $params = [':target' => $targetUserId];
} else {
    // Home feed: posts and reposts by people the viewer follows, plus their own.
    if (!$viewerId) {
        jsonError(401, 'Login required for the home feed.');
    }
    $entries = "$postEntries
        WHERE p.user_id = :viewer OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = :viewer2)
        UNION ALL $repostEntries
        WHERE r.user_id = :viewer3 OR r.user_id IN (SELECT following_id FROM follows WHERE follower_id = :viewer4)";
    $params = [':viewer' => $viewerId, ':viewer2' => $viewerId, ':viewer3' => $viewerId, ':viewer4' => $viewerId];
}

// The post, author and counts are always the original post's; the reposter
// only fills reposted_by. Fetch one extra row to tell the client if there's
// another page.
$sql = 'SELECT ' . POST_COLUMNS . ',
            f.reposter_id, ru.username AS reposter_username, ru.display_name AS reposter_display_name
        FROM (' . $entries . ') f
        JOIN posts p ON p.id = f.post_id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN users ru ON ru.id = f.reposter_id
        ORDER BY f.sort_time DESC, f.is_repost DESC, f.entry_id DESC
        LIMIT :limit OFFSET :offset';

$stmt = $pdo->prepare($sql);
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value, PDO::PARAM_INT);
}
$stmt->bindValue(':limit', $perPage + 1, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

$hasMore = count($rows) > $perPage;
$rows = array_slice($rows, 0, $perPage);

jsonResponse(200, ['posts' => formatPosts($pdo, $viewerId, $rows), 'has_more' => $hasMore]);
