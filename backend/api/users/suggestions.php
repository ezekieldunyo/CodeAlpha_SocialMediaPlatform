<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// "Who to follow": users the viewer doesn't follow yet, most-followed first.
$userId = requireAuth();
$limit = min(50, max(1, (int) ($_GET['limit'] ?? 5)));

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS follower_count
     FROM users u
     WHERE u.id <> :me
       AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = :me2)
     ORDER BY follower_count DESC, u.created_at DESC
     LIMIT :limit'
);
$stmt->bindValue(':me', $userId, PDO::PARAM_INT);
$stmt->bindValue(':me2', $userId, PDO::PARAM_INT);
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->execute();

$users = array_map(function ($row) {
    return [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'bio' => $row['bio'],
        'avatar_url' => $row['avatar_url'],
        'follower_count' => (int) $row['follower_count'],
        'is_following' => false,
    ];
}, $stmt->fetchAll());

jsonResponse(200, ['users' => $users]);
