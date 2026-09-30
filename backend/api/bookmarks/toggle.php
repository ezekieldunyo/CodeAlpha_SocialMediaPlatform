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

// Same toggle approach as likes/toggle.php: remove an existing bookmark; if
// there was nothing to remove, add one.
$stmt = $pdo->prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?');
$stmt->execute([$userId, $postId]);
$bookmarked = $stmt->rowCount() === 0;

if ($bookmarked) {
    // INSERT IGNORE covers a double-click racing two requests past the
    // DELETE above; the UNIQUE (user_id, post_id) key keeps it to one row.
    $stmt = $pdo->prepare('INSERT IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)');
    $stmt->execute([$userId, $postId]);
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM bookmarks WHERE post_id = ?');
$stmt->execute([$postId]);

jsonResponse(200, [
    'bookmarked' => $bookmarked,
    'bookmark_count' => (int) $stmt->fetchColumn(),
]);
