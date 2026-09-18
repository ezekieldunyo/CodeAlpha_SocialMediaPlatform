<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('GET');

$userId = requireId($_GET, 'user_id');
$type = $_GET['type'] ?? 'followers';
if (!in_array($type, ['followers', 'following'], true)) {
    sendError("Query 'type' must be either followers or following.", 400);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT 1 FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetchColumn()) {
    sendError('User not found.', 404);
}

$sql = $type === 'followers'
    ? 'SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ? ORDER BY f.created_at DESC'
    : 'SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute([$userId]);

sendJson(['type' => $type, 'users' => array_map('publicUser', $stmt->fetchAll())]);
