<?php
// Shared shaping for post rows so the feed, profile feed and create endpoint
// all return the same structure.

require_once __DIR__ . '/auth.php';

const POSTS_PER_PAGE = 10;

function postSelectSql(): string {
    return 'SELECT p.id, p.content, p.image_url, p.created_at,
                   u.id AS author_id, u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
                   EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked
            FROM posts p
            JOIN users u ON u.id = p.user_id';
}

function shapePost(array $row): array {
    return [
        'id' => (int) $row['id'],
        'content' => $row['content'],
        'image_url' => $row['image_url'],
        'created_at' => $row['created_at'],
        'like_count' => (int) $row['like_count'],
        'comment_count' => (int) $row['comment_count'],
        'liked' => (bool) $row['liked'],
        'author' => [
            'id' => (int) $row['author_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
    ];
}
