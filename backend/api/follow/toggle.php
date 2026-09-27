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
requireFields($data, ['user_id']);
$targetId = (int) $data['user_id'];

if ($targetId === $userId) {
    jsonError(400, 'You cannot follow yourself.');
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$targetId]);
if (!$stmt->fetch()) {
    jsonError(404, 'User not found.');
}

// Same toggle approach as likes/toggle.php.
$stmt = $pdo->prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
$stmt->execute([$userId, $targetId]);
$following = $stmt->rowCount() === 0;

if ($following) {
    $stmt = $pdo->prepare('INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)');
    $stmt->execute([$userId, $targetId]);
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE following_id = ?');
$stmt->execute([$targetId]);

jsonResponse(200, [
    'following' => $following,
    'follower_count' => (int) $stmt->fetchColumn(),
]);
