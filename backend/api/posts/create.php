<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();
$data = getJsonBody();
requireFields($data, ['content']);

$content = trim($data['content']);
$imageUrl = isset($data['image_url']) ? trim($data['image_url']) : null;

if ($content === '' || mb_strlen($content) > 1000) {
    jsonError(400, 'Post content must be between 1 and 1000 characters.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
$stmt->execute([$userId, $content, $imageUrl]);
$postId = (int) $pdo->lastInsertId();

// Return the post joined with author info, same shape the feed uses,
// so the frontend can just prepend this to its post list.
$stmt = $pdo->prepare(
    'SELECT p.id, p.content, p.image_url, p.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url
     FROM posts p JOIN users u ON u.id = p.user_id
     WHERE p.id = ?'
);
$stmt->execute([$postId]);
$row = $stmt->fetch();

jsonResponse(201, [
    'post' => [
        'id' => (int) $row['id'],
        'content' => $row['content'],
        'image_url' => $row['image_url'],
        'created_at' => $row['created_at'],
        'like_count' => 0,
        'comment_count' => 0,
        'liked_by_viewer' => false,
        'author' => [
            'id' => (int) $row['user_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ],
]);
