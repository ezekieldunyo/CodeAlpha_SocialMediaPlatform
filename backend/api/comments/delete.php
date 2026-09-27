<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();

// Same as posts/delete.php: accept the id from the query string or a JSON body.
$commentId = isset($_GET['id']) ? (int) $_GET['id'] : null;
if (!$commentId) {
    $data = getJsonBody();
    $commentId = isset($data['id']) ? (int) $data['id'] : null;
}
if (!$commentId) {
    jsonError(400, 'Comment id is required.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT user_id FROM comments WHERE id = ?');
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

if (!$comment) {
    jsonError(404, 'Comment not found.');
}
if ((int) $comment['user_id'] !== $userId) {
    jsonError(403, 'You can only delete your own comments.');
}

$stmt = $pdo->prepare('DELETE FROM comments WHERE id = ?');
$stmt->execute([$commentId]);

jsonResponse(200, ['deleted' => true]);
