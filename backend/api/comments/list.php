<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('GET');

$postId = requireId($_GET, 'post_id');

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT c.id, c.post_id, c.content, c.created_at,
            u.id AS author_id, u.username, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC, c.id ASC'
);
$stmt->execute([$postId]);

$comments = array_map(static function (array $row): array {
    return [
        'id' => (int) $row['id'],
        'post_id' => (int) $row['post_id'],
        'content' => $row['content'],
        'created_at' => $row['created_at'],
        'author' => [
            'id' => (int) $row['author_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ];
}, $stmt->fetchAll());

sendJson(['comments' => $comments]);
