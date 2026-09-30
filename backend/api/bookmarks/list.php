<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/posts.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// The logged-in user's saved posts, most recently saved first, paginated like
// posts/list.php and in the same shape as feed items.
$userId = requireAuth();
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 20;

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    POST_SELECT . '
    JOIN bookmarks b ON b.post_id = p.id AND b.user_id = :viewer
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT :limit OFFSET :offset'
);
$stmt->bindValue(':viewer', $userId, PDO::PARAM_INT);
$stmt->bindValue(':limit', $perPage + 1, PDO::PARAM_INT); // one extra: is there another page?
$stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

$hasMore = count($rows) > $perPage;
$rows = array_slice($rows, 0, $perPage);

jsonResponse(200, ['posts' => formatPosts($pdo, $userId, $rows), 'has_more' => $hasMore]);
