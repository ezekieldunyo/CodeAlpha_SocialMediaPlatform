<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/posts.php';

requireMethod('GET');

$feed = $_GET['feed'] ?? 'home';
if (!in_array($feed, ['home', 'user', 'explore'], true)) {
    sendError("Query 'feed' must be one of: home, user, explore.", 400);
}

$page = optionalPage($_GET);
$offset = ($page - 1) * POSTS_PER_PAGE;

$viewer = currentUser();
$viewerId = $viewer ? (int) $viewer['id'] : 0;

$pdo = getDbConnection();
$params = [$viewerId];
$where = '';

if ($feed === 'user') {
    $where = ' WHERE p.user_id = ?';
    $params[] = requireId($_GET, 'user_id');
} elseif ($feed === 'home') {
    if (!$viewer) {
        sendError('Authentication required for the home feed.', 401);
    }
    // Own posts plus posts from everyone the viewer follows.
    $where = ' WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)';
    $params[] = $viewerId;
    $params[] = $viewerId;
}

// Fetch one extra row to tell whether another page exists.
$sql = postSelectSql() . $where . ' ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?';
$params[] = POSTS_PER_PAGE + 1;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
foreach ($params as $index => $value) {
    $stmt->bindValue($index + 1, $value, PDO::PARAM_INT);
}
$stmt->execute();
$rows = $stmt->fetchAll();

$hasMore = count($rows) > POSTS_PER_PAGE;
$rows = array_slice($rows, 0, POSTS_PER_PAGE);

sendJson([
    'posts' => array_map('shapePost', $rows),
    'has_more' => $hasMore,
    'page' => $page,
]);
