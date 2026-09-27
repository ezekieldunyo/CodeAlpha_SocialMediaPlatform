<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// Single post, for the /post/:id page. Public: guests can read it, and a
// logged-in viewer also gets liked_by_viewer.
$postId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($postId <= 0) {
    jsonError(400, 'Post id is required.');
}

$viewerId = optionalAuth();
$pdo = getDbConnection();

// Same columns and counts as posts/list.php so the frontend can render it
// with the same component.
$stmt = $pdo->prepare(
    'SELECT p.id, p.content, p.image_url, p.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ?'
);
$stmt->execute([$postId]);
$row = $stmt->fetch();

if (!$row) {
    jsonError(404, 'Post not found.');
}

$liked = false;
if ($viewerId) {
    $check = $pdo->prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?');
    $check->execute([$viewerId, $postId]);
    $liked = (bool) $check->fetch();
}

jsonResponse(200, [
    'post' => [
        'id' => (int) $row['id'],
        'content' => $row['content'],
        'image_url' => $row['image_url'],
        'created_at' => $row['created_at'],
        'like_count' => (int) $row['like_count'],
        'comment_count' => (int) $row['comment_count'],
        'liked_by_viewer' => $liked,
        'author' => [
            'id' => (int) $row['user_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ],
]);
