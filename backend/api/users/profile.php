<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('GET');

$pdo = getDbConnection();

if (isset($_GET['username'])) {
    $username = strtolower(trim((string) $_GET['username']));
    $stmt = $pdo->prepare(
        'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE username = ?'
    );
    $stmt->execute([$username]);
} else {
    $userId = requireId($_GET, 'id');
    $stmt = $pdo->prepare(
        'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?'
    );
    $stmt->execute([$userId]);
}

$user = $stmt->fetch();
if (!$user) {
    sendError('User not found.', 404);
}
$userId = (int) $user['id'];

$stmt = $pdo->prepare('SELECT COUNT(*) FROM posts WHERE user_id = ?');
$stmt->execute([$userId]);
$postCount = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE following_id = ?');
$stmt->execute([$userId]);
$followerCount = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE follower_id = ?');
$stmt->execute([$userId]);
$followingCount = (int) $stmt->fetchColumn();

$viewer = currentUser();
$isFollowing = false;
if ($viewer && (int) $viewer['id'] !== $userId) {
    $stmt = $pdo->prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?');
    $stmt->execute([(int) $viewer['id'], $userId]);
    $isFollowing = (bool) $stmt->fetchColumn();
}

sendJson([
    'user' => publicUser($user) + [
        'post_count' => $postCount,
        'follower_count' => $followerCount,
        'following_count' => $followingCount,
        'is_following' => $isFollowing,
        'is_self' => $viewer !== null && (int) $viewer['id'] === $userId,
    ],
]);
