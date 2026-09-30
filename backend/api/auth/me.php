<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError(405, 'Method not allowed.');
}

// The current user, fresh from the database. The frontend calls this when it
// starts to confirm a saved login still belongs to an existing account (401
// otherwise) and to refresh the details it keeps in localStorage.
$userId = requireAuth();

$stmt = getDbConnection()->prepare(
    'SELECT id, username, email, display_name, bio, avatar_url FROM users WHERE id = ?'
);
$stmt->execute([$userId]);
$user = $stmt->fetch();

jsonResponse(200, [
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'bio' => $user['bio'],
        'avatar_url' => $user['avatar_url'],
    ],
]);
