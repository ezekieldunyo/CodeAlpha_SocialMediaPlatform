<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

$postId = isset($_GET['post_id']) ? (int) $_GET['post_id'] : 0;
if (!$postId) {
    jsonError(400, 'post_id is required.');
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonError(404, 'Post not found.');
}

// Oldest first, so the thread reads top to bottom.
$stmt = $pdo->prepare(
    'SELECT c.id, c.post_id, c.content, c.created_at,
            u.id AS user_id, u.username, u.display_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC, c.id ASC'
);
$stmt->execute([$postId]);

$comments = array_map(function ($row) {
    return [
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
    ];
}, $stmt->fetchAll());

jsonResponse(200, ['comments' => $comments]);
