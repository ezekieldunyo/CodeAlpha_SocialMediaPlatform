<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('POST');

$user = requireUser();
$body = readJsonBody();
$targetId = requireId($body, 'user_id');
$followerId = (int) $user['id'];

if ($targetId === $followerId) {
    sendError('You cannot follow yourself.', 400);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
$stmt->execute([$targetId]);
if (!$stmt->fetchColumn()) {
    sendError('User not found.', 404);
}

$stmt = $pdo->prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?');
$stmt->execute([$followerId, $targetId]);
$existing = $stmt->fetchColumn();

if ($existing) {
    $stmt = $pdo->prepare('DELETE FROM follows WHERE id = ?');
    $stmt->execute([(int) $existing]);
    $following = false;
} else {
    $stmt = $pdo->prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
    $stmt->execute([$followerId, $targetId]);
    $following = true;
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE following_id = ?');
$stmt->execute([$targetId]);

sendJson(['following' => $following, 'follower_count' => (int) $stmt->fetchColumn()]);
