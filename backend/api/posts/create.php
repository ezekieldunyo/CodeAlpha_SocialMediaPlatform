<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/posts.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();
$data = getJsonBody();

$content = trim((string) ($data['content'] ?? ''));
$imageUrl = trim((string) ($data['image_url'] ?? ''));
$imageUrl = $imageUrl === '' ? null : $imageUrl;

// A post needs text, an image, or both.
if ($content === '' && $imageUrl === null) {
    jsonError(400, 'Write something or add a photo to post.');
}
if (mb_strlen($content) > 1000) {
    jsonError(400, 'Post content must be 1000 characters or fewer.');
}
if ($imageUrl !== null && (mb_strlen($imageUrl) > 500 || !preg_match('#^https?://#i', $imageUrl))) {
    jsonError(400, 'Image must be an http(s) URL of at most 500 characters.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
$stmt->execute([$userId, $content, $imageUrl]);
$postId = (int) $pdo->lastInsertId();

// Return the post joined with author info, same shape the feed uses,
// so the frontend can just prepend this to its post list.
$stmt = $pdo->prepare(POST_SELECT . ' WHERE p.id = ?');
$stmt->execute([$postId]);

// A brand-new post has no likes or bookmarks yet.
jsonResponse(201, ['post' => formatPost($stmt->fetch())]);
