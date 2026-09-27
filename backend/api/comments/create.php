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
requireFields($data, ['post_id', 'content']);

$postId = (int) $data['post_id'];
$content = trim($data['content']);

if ($content === '' || mb_strlen($content) > 500) {
    jsonError(400, 'Comment must be between 1 and 500 characters.');
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonError(404, 'Post not found.');
}

$stmt = $pdo->prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
$stmt->execute([$postId, $userId, $content]);
$commentId = (int) $pdo->lastInsertId();

// Same shape as comments/list.php so the frontend can append it directly.
$stmt = $pdo->prepare(
    'SELECT c.id, c.post_id, c.content, c.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.id = ?'
);
$stmt->execute([$commentId]);
$row = $stmt->fetch();

jsonResponse(201, [
    'comment' => [
        'id' => (int) $row['id'],
        'post_id' => (int) $row['post_id'],
        'content' => $row['content'],
        'created_at' => $row['created_at'],
        'author' => [
            'id' => (int) $row['user_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ],
]);
