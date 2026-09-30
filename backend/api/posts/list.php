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

if ($feed === 'all') {
    // "For you": everyone's posts, newest first. Public, like profile feeds.
    $where = '1 = 1';
    $params = [];
} elseif ($feed === 'user') {
    if (!$targetUserId) {
        jsonError(400, 'user_id is required when feed=user.');
    }
    $where = 'p.user_id = :target';
    $params = [':target' => $targetUserId];
} else {
    // Home feed: posts from people the viewer follows, plus their own posts.
    if (!$viewerId) {
        jsonError(401, 'Login required for the home feed.');
    }
    $where = '(p.user_id = :viewer OR p.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = :viewer2
    ))';
    $params = [':viewer' => $viewerId, ':viewer2' => $viewerId];
}

// Fetch one extra row so we can tell the client if there's another page.
$sql = POST_SELECT . "
        WHERE $where
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT :limit OFFSET :offset";

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
