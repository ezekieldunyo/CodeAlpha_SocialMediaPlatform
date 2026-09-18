<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('POST');

$user = requireUser();
$body = readJsonBody();
$postId = requireId($body, 'post_id');
$userId = (int) $user['id'];

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT 1 FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetchColumn()) {
    sendError('Post not found.', 404);
}

$stmt = $pdo->prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?');
$stmt->execute([$postId, $userId]);
$existing = $stmt->fetchColumn();

if ($existing) {
    $stmt = $pdo->prepare('DELETE FROM likes WHERE id = ?');
    $stmt->execute([(int) $existing]);
    $liked = false;
} else {
    $stmt = $pdo->prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
    $stmt->execute([$postId, $userId]);
    $liked = true;
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM likes WHERE post_id = ?');
$stmt->execute([$postId]);

sendJson(['liked' => $liked, 'like_count' => (int) $stmt->fetchColumn()]);
