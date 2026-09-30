<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../config/database.php';

// A token only proves who the user *was* when they logged in. If that account
// has since been deleted, the token is still correctly signed and unexpired,
// so we also check the user row still exists. Without this, a stale session
// could upload files and then crash on foreign-key errors when writing posts.
function tokenUserId(): ?int {
    $payload = verifyJwt(getBearerToken());
    if (!$payload || !isset($payload['user_id'])) {
        return null;
    }
    $userId = (int) $payload['user_id'];

    $stmt = getDbConnection()->prepare('SELECT 1 FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    return $stmt->fetchColumn() ? $userId : null;
}

// Call this at the top of any endpoint that requires a logged-in user.
// Returns the authenticated user's id, or sends a 401 and exits.
function requireAuth(): int {
    $userId = tokenUserId();
    if ($userId === null) {
        jsonError(401, 'Your session has ended. Please log in again.');
    }
    return $userId;
}

// For endpoints where auth is optional (e.g. viewing a profile shows
// extra info if you're logged in, but works for guests too).
// Returns the user id if the token is valid and the account exists, otherwise null.
function optionalAuth(): ?int {
    return tokenUserId();
}
