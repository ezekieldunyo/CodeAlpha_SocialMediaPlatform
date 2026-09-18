<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('DELETE', 'POST');

$user = requireUser();
$body = readJsonBody() + $_GET;
$postId = requireId($body, 'post_id');

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT user_id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
$post = $stmt->fetch();

if (!$post) {
    sendError('Post not found.', 404);
}
if ((int) $post['user_id'] !== (int) $user['id']) {
    sendError('You can only delete your own posts.', 403);
}

$stmt = $pdo->prepare('DELETE FROM posts WHERE id = ?');
$stmt->execute([$postId]);

sendJson(['deleted' => true, 'post_id' => $postId]);
