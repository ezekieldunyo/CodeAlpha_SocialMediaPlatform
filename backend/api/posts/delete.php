<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if (requestMethod() !== 'DELETE') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();

// DELETE requests don't reliably get parsed into $_GET by PHP's built-in
// server, so accept the post id from either the query string or a JSON body.
$postId = isset($_GET['id']) ? (int) $_GET['id'] : null;
if (!$postId) {
    $data = getJsonBody();
    $postId = isset($data['id']) ? (int) $data['id'] : null;
}
if (!$postId) {
    jsonError(400, 'Post id is required.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT user_id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
$post = $stmt->fetch();

if (!$post) {
    jsonError(404, 'Post not found.');
}
if ((int) $post['user_id'] !== $userId) {
    jsonError(403, 'You can only delete your own posts.');
}

$stmt = $pdo->prepare('DELETE FROM posts WHERE id = ?');
$stmt->execute([$postId]);

jsonResponse(200, ['deleted' => true]);
