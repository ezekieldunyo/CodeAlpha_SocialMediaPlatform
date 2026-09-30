<?php
// The one shape every endpoint uses for a post (feeds, single post, saved
// posts, a newly created post), so the frontend renders them all the same way.

// Columns + counts for a post (p) and its author (u).
const POST_COLUMNS = 'p.id, p.content, p.image_url, p.created_at,
        u.id AS user_id, u.username, u.display_name, u.avatar_url,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM reposts rp WHERE rp.post_id = p.id) AS repost_count';

// Callers add WHERE / ORDER BY.
const POST_SELECT = 'SELECT ' . POST_COLUMNS . '
    FROM posts p
    JOIN users u ON u.id = p.user_id';

// Which of $postIds the viewer has liked, bookmarked and reposted, in one
// query each. Returns [likedIds, bookmarkedIds, repostedIds]; all empty for guests.
function viewerPostFlags(PDO $pdo, ?int $viewerId, array $postIds): array {
    if (!$viewerId || !$postIds) {
        return [[], [], []];
    }
    $postIds = array_values(array_unique(array_map('intval', $postIds)));
    $placeholders = implode(',', array_fill(0, count($postIds), '?'));
    $flags = [];
    foreach (['likes', 'bookmarks', 'reposts'] as $table) { // fixed names, never user input
        $stmt = $pdo->prepare("SELECT post_id FROM $table WHERE user_id = ? AND post_id IN ($placeholders)");
        $stmt->execute(array_merge([$viewerId], $postIds));
        $flags[] = array_map('intval', array_column($stmt->fetchAll(), 'post_id'));
    }
    return $flags;
}

// $row may carry reposter_id / reposter_username / reposter_display_name
// (feed items shown because of a repost); reposted_by is null otherwise.
function formatPost(array $row, array $likedIds = [], array $bookmarkedIds = [], array $repostedIds = []): array {
    $id = (int) $row['id'];
    return [
        'id' => $id,
        'content' => $row['content'],
        'image_url' => $row['image_url'],
        'created_at' => $row['created_at'],
        'like_count' => (int) ($row['like_count'] ?? 0),
        'comment_count' => (int) ($row['comment_count'] ?? 0),
        'repost_count' => (int) ($row['repost_count'] ?? 0),
        'liked_by_viewer' => in_array($id, $likedIds, true),
        'bookmarked_by_viewer' => in_array($id, $bookmarkedIds, true),
        'reposted_by_viewer' => in_array($id, $repostedIds, true),
        'author' => [
            'id' => (int) $row['user_id'],
            'username' => $row['username'],
            'display_name' => $row['display_name'],
            'avatar_url' => $row['avatar_url'],
        ],
        'reposted_by' => empty($row['reposter_id']) ? null : [
            'id' => (int) $row['reposter_id'],
            'username' => $row['reposter_username'],
            'display_name' => $row['reposter_display_name'],
        ],
    ];
}

// Formats a page of rows for $viewerId.
function formatPosts(PDO $pdo, ?int $viewerId, array $rows): array {
    [$liked, $bookmarked, $reposted] = viewerPostFlags($pdo, $viewerId, array_column($rows, 'id'));
    return array_map(fn ($row) => formatPost($row, $liked, $bookmarked, $reposted), $rows);
}
