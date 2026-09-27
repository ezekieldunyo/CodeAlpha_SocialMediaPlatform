<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// Accept either ?id= or ?username=
$id = $_GET['id'] ?? null;
$username = $_GET['username'] ?? null;

if (!$id && !$username) {
    jsonError(400, 'Provide either id or username.');
}

$pdo = getDbConnection();

if ($id) {
    $stmt = $pdo->prepare(
        'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?'
    );
    $stmt->execute([(int) $id]);
} else {
    $stmt = $pdo->prepare(
        'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE username = ?'
    );
    $stmt->execute([$username]);
}

$user = $stmt->fetch();
if (!$user) {
    jsonError(404, 'User not found.');
}

$userId = (int) $user['id'];

$postCount = $pdo->prepare('SELECT COUNT(*) FROM posts WHERE user_id = ?');
$postCount->execute([$userId]);

$followerCount = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE following_id = ?');
$followerCount->execute([$userId]);

$followingCount = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE follower_id = ?');
$followingCount->execute([$userId]);

// If the request is authenticated, tell the client whether *they* follow this user.
$viewerId = optionalAuth();
$isFollowing = false;
if ($viewerId && $viewerId !== $userId) {
    $check = $pdo->prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?');
    $check->execute([$viewerId, $userId]);
    $isFollowing = (bool) $check->fetch();
}

jsonResponse(200, [
    'user' => [
        'id' => $userId,
        'username' => $user['username'],
        'display_name' => $user['display_name'],
        'bio' => $user['bio'],
        'avatar_url' => $user['avatar_url'],
        'joined_at' => $user['created_at'],
    ],
    'post_count' => (int) $postCount->fetchColumn(),
    'follower_count' => (int) $followerCount->fetchColumn(),
    'following_count' => (int) $followingCount->fetchColumn(),
    'is_following' => $isFollowing,
    'is_self' => $viewerId === $userId,
]);
