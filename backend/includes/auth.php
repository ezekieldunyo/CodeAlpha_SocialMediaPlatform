<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/helpers.php';

// Call this at the top of any endpoint that requires a logged-in user.
// Returns the authenticated user's id, or sends a 401 and exits.
function requireAuth(): int {
    $token = getBearerToken();
    $payload = verifyJwt($token);

    if (!$payload || !isset($payload['user_id'])) {
        jsonError(401, 'Missing or invalid authentication token.');
    }

    return (int) $payload['user_id'];
}

// For endpoints where auth is optional (e.g. viewing a profile shows
// extra info if you're logged in, but works for guests too).
// Returns the user id if a valid token is present, otherwise null.
function optionalAuth(): ?int {
    $token = getBearerToken();
    $payload = verifyJwt($token);
    return $payload['user_id'] ?? null;
}
