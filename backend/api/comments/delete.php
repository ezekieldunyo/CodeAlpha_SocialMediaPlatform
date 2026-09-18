<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('DELETE', 'POST');

$user = requireUser();
$body = readJsonBody() + $_GET;
$commentId = requireId($body, 'comment_id');

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT user_id, post_id FROM comments WHERE id = ?');
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

if (!$comment) {
    sendError('Comment not found.', 404);
}
if ((int) $comment['user_id'] !== (int) $user['id']) {
    sendError('You can only delete your own comments.', 403);
}

$stmt = $pdo->prepare('DELETE FROM comments WHERE id = ?');
$stmt->execute([$commentId]);

$stmt = $pdo->prepare('SELECT COUNT(*) FROM comments WHERE post_id = ?');
$stmt->execute([(int) $comment['post_id']]);

sendJson([
    'deleted' => true,
    'comment_id' => $commentId,
    'comment_count' => (int) $stmt->fetchColumn(),
]);
