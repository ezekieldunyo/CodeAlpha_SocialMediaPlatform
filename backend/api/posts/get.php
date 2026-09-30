<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/posts.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// ?client_token=: "did my post go through?" after a post attempt that failed
// or got no answer. Returns the viewer's own post saved for that draft, or 404
// if nothing was saved.
if (isset($_GET['client_token'])) {
    $userId = requireAuth();
    if (!isValidClientToken($_GET['client_token'])) {
        jsonError(400, 'client_token must be 16-64 letters, digits, "_" or "-".');
    }
    $pdo = getDbConnection();
    if (!postsHaveClientToken($pdo)) {
        jsonError(503, "This server can't check that yet (database not updated).");
    }
    $row = findPostByClientToken($pdo, $userId, $_GET['client_token']);
    if (!$row) {
        jsonError(404, 'Nothing was posted for that attempt.');
    }
    jsonResponse(200, ['post' => formatPosts($pdo, $userId, [$row])[0]]);
}

// Single post, for the /post/:id page. Public: guests can read it, and a
// logged-in viewer also gets liked_by_viewer and bookmarked_by_viewer.
$postId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($postId <= 0) {
    jsonError(400, 'Post id is required.');
}

$viewerId = optionalAuth();
$pdo = getDbConnection();

// Same columns and counts as posts/list.php so the frontend can render it
// with the same component.
$stmt = $pdo->prepare(POST_SELECT . ' WHERE p.id = ?');
$stmt->execute([$postId]);
$row = $stmt->fetch();

if (!$row) {
    jsonError(404, 'Post not found.');
}

jsonResponse(200, ['post' => formatPosts($pdo, $viewerId, [$row])[0]]);
