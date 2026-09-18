<?php
// Backs the "who to follow" column in the mockup: users the viewer does not
// already follow, most-followed first.
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('GET');

$viewer = currentUser();
$viewerId = $viewer ? (int) $viewer['id'] : 0;
$limit = 5;

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
            (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS follower_count
     FROM users u
     WHERE u.id <> ?
       AND NOT EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id)
     ORDER BY follower_count DESC, u.created_at DESC
     LIMIT ?'
);
$stmt->bindValue(1, $viewerId, PDO::PARAM_INT);
$stmt->bindValue(2, $viewerId, PDO::PARAM_INT);
$stmt->bindValue(3, $limit, PDO::PARAM_INT);
$stmt->execute();

$users = array_map(static function (array $row): array {
    return publicUser($row) + ['follower_count' => (int) $row['follower_count']];
}, $stmt->fetchAll());

sendJson(['users' => $users]);
