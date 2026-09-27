<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// ?user_id=  and optionally ?type=following to list who they follow instead.
$targetId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
$type = $_GET['type'] ?? 'followers';

if (!$targetId) {
    jsonError(400, 'user_id is required.');
}
if ($type !== 'followers' && $type !== 'following') {
    jsonError(400, "type must be 'followers' or 'following'.");
}

$viewerId = optionalAuth();
$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$targetId]);
if (!$stmt->fetch()) {
    jsonError(404, 'User not found.');
}

// followers: rows where the target is being followed; following: the reverse.
// Both column names are fixed strings chosen above, never user input.
[$matchColumn, $userColumn] = $type === 'followers'
    ? ['following_id', 'follower_id']
    : ['follower_id', 'following_id'];

$stmt = $pdo->prepare(
    "SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
            EXISTS(SELECT 1 FROM follows v WHERE v.follower_id = ? AND v.following_id = u.id) AS is_following
     FROM follows f
     JOIN users u ON u.id = f.$userColumn
     WHERE f.$matchColumn = ?
     ORDER BY f.created_at DESC"
);
$stmt->execute([$viewerId ?? 0, $targetId]);

$users = array_map(function ($row) {
    return [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'bio' => $row['bio'],
        'avatar_url' => $row['avatar_url'],
        'is_following' => (bool) $row['is_following'],
    ];
}, $stmt->fetchAll());

jsonResponse(200, ['users' => $users]);
