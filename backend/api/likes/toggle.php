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
requireFields($data, ['post_id']);
$postId = (int) $data['post_id'];

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM posts WHERE id = ?');
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonError(404, 'Post not found.');
}

// Try to remove an existing like; if there was nothing to remove, add one.
$stmt = $pdo->prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?');
$stmt->execute([$userId, $postId]);
$liked = $stmt->rowCount() === 0;

if ($liked) {
    // INSERT IGNORE covers a double-click racing two requests past the
    // DELETE above — the primary key keeps it to one like either way.
    $stmt = $pdo->prepare('INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)');
    $stmt->execute([$userId, $postId]);
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM likes WHERE post_id = ?');
$stmt->execute([$postId]);

jsonResponse(200, [
    'liked' => $liked,
    'like_count' => (int) $stmt->fetchColumn(),
]);
