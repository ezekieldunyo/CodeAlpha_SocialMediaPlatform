<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('POST');

$body = readJsonBody();
$username = strtolower(requireString($body, 'username', 3, 30));
$email = requireEmail($body, 'email');
$password = requireString($body, 'password', 8, 72);
$displayName = requireString($body, 'display_name', 1, 60);

if (!preg_match('/^[a-z0-9_]+$/', $username)) {
    sendError('Username may only contain letters, numbers and underscores.', 400);
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT username, email FROM users WHERE username = ? OR email = ?');
$stmt->execute([$username, $email]);
if ($existing = $stmt->fetch()) {
    sendError(
        $existing['username'] === $username ? 'That username is already taken.' : 'That email is already registered.',
        409
    );
}

$stmt = $pdo->prepare(
    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$username, $email, password_hash($password, PASSWORD_DEFAULT), $displayName]);
$userId = (int) $pdo->lastInsertId();

$stmt = $pdo->prepare(
    'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?'
);
$stmt->execute([$userId]);
$user = $stmt->fetch();

sendJson([
    'token' => createJwt(['sub' => $userId]),
    'user' => publicUser($user),
], 201);
