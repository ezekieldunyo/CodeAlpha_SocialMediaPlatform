<?php
// Auth middleware: turns the Bearer token into the current user row.

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';

// Returns the current user row, or null when the request is unauthenticated.
function currentUser(): ?array {
    $payload = verifyJwt(getBearerToken());
    if (!$payload || !isset($payload['sub'])) {
        return null;
    }
    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT id, username, email, display_name, bio, avatar_url, created_at FROM users WHERE id = ?'
    );
    $stmt->execute([(int) $payload['sub']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

// Same as currentUser(), but ends the request with 401 when not logged in.
function requireUser(): array {
    $user = currentUser();
    if ($user === null) {
        sendError('Authentication required.', 401);
    }
    return $user;
}

// Shapes a user row for API responses (never exposes password_hash/email of
// other users).
function publicUser(array $row): array {
    return [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'bio' => $row['bio'] ?? '',
        'avatar_url' => $row['avatar_url'],
        'created_at' => $row['created_at'],
    ];
}
