<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/posts.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();
$data = getJsonBody();

$content = trim((string) ($data['content'] ?? ''));
$imageUrl = trim((string) ($data['image_url'] ?? ''));
$imageUrl = $imageUrl === '' ? null : $imageUrl;

// A post needs text, an image, or both.
if ($content === '' && $imageUrl === null) {
    jsonError(400, 'Write something or add a photo to post.');
}
if (mb_strlen($content) > 1000) {
    jsonError(400, 'Post content must be 1000 characters or fewer.');
}
if ($imageUrl !== null && (mb_strlen($imageUrl) > 500 || !preg_match('#^https?://#i', $imageUrl))) {
    jsonError(400, 'Image must be an http(s) URL of at most 500 characters.');
}
// Optional: the app's id for this draft (see includes/posts.php).
$clientToken = $data['client_token'] ?? null;
if ($clientToken !== null && !isValidClientToken($clientToken)) {
    jsonError(400, 'client_token must be 16-64 letters, digits, "_" or "-".');
}

$pdo = getDbConnection();
// Without the column (database not migrated yet) posts still work, just
// without the retry protection.
$useToken = $clientToken !== null && postsHaveClientToken($pdo);

// A retry of a draft that was already saved gets that post back (200)
// instead of a second copy.
if ($useToken && ($existing = findPostByClientToken($pdo, $userId, $clientToken))) {
    jsonResponse(200, ['post' => formatPosts($pdo, $userId, [$existing])[0]]);
}

// Save the post and read it back in one transaction. If anything fails
// (e.g. a missing table), nothing is saved, so an error always means "not
// posted" and trying again can't create a duplicate.
$pdo->beginTransaction();
try {
    $stmt = $useToken
        ? $pdo->prepare('INSERT INTO posts (user_id, content, image_url, client_token) VALUES (?, ?, ?, ?)')
        : $pdo->prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
    $stmt->execute($useToken ? [$userId, $content, $imageUrl, $clientToken] : [$userId, $content, $imageUrl]);
    $postId = (int) $pdo->lastInsertId();

    // Return the post joined with author info, same shape the feed uses,
    // so the frontend can just prepend this to its post list.
    $stmt = $pdo->prepare(POST_SELECT . ' WHERE p.id = ?');
    $stmt->execute([$postId]);
    $row = $stmt->fetch();
    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    // Two requests for the same draft at once: the other one saved it.
    if ($useToken && ($e->errorInfo[1] ?? null) === 1062 && ($existing = findPostByClientToken($pdo, $userId, $clientToken))) {
        jsonResponse(200, ['post' => formatPosts($pdo, $userId, [$existing])[0]]);
    }
    throw $e;
}

// A brand-new post has no likes, bookmarks or reposts yet.
jsonResponse(201, ['post' => formatPost($row)]);
