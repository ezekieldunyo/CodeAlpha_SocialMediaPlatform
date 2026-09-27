<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

$feed = $_GET['feed'] ?? 'home';           // 'home' or 'user'
$targetUserId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : null;
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;
$offset = ($page - 1) * $perPage;

$viewerId = optionalAuth();
$pdo = getDbConnection();

if ($feed === 'user') {
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
$sql = "SELECT p.id, p.content, p.image_url, p.created_at,
               u.id AS user_id, u.username, u.display_name, u.avatar_url,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE $where
        ORDER BY p.created_at DESC
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

// Figure out which of these posts the viewer has liked, in one query.
$likedIds = [];
if ($viewerId && $rows) {
    $postIds = array_column($rows, 'id');
    $placeholders = implode(',', array_fill(0, count($postIds), '?'));
    $likeStmt = $pdo->prepare(
        "SELECT post_id FROM likes WHERE user_id = ? AND post_id IN ($placeholders)"
    );
    $likeStmt->execute(array_merge([$viewerId], $postIds));
    $likedIds = array_column($likeStmt->fetchAll(), 'post_id');
}

$posts = array_map(function ($row) use ($likedIds) {
    return [
        'id' => (int) $row['id'],
        'content' => $row['content'],
        'image_url' => $row['image_url'],
        'created_at' => $row['created_at'],
        'like_count' => (int) $row['like_count'],
        'comment_count' => (int) $row['comment_count'],
        'liked_by_viewer' => in_array($row['id'], $likedIds),
        'author' => [
            'id' => (int) $row['user_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ];
}, $rows);

jsonResponse(200, ['posts' => $posts, 'has_more' => $hasMore]);
