<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('POST');

$user = requireUser();
$body = readJsonBody();
$postId = requireId($body, 'post_id');
$content = requireString($body, 'content', 1, 500);

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT 1 FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetchColumn()) {
    sendError('Post not found.', 404);
}

$stmt = $pdo->prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
$stmt->execute([$postId, (int) $user['id'], $content]);
$commentId = (int) $pdo->lastInsertId();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM comments WHERE post_id = ?');
$stmt->execute([$postId]);
$commentCount = (int) $stmt->fetchColumn();

sendJson([
    'comment' => [
        'id' => $commentId,
        'post_id' => $postId,
        'content' => $content,
        'created_at' => date('Y-m-d H:i:s'),
        'author' => [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'display_name' => $user['display_name'],
            'avatar_url' => $user['avatar_url'],
        ],
    ],
    'comment_count' => $commentCount,
], 201);
