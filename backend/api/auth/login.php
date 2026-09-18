<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

requireMethod('POST');

$body = readJsonBody();
$email = requireEmail($body, 'email');
$password = requireString($body, 'password', 1, 72);

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT id, username, display_name, bio, avatar_url, created_at, password_hash FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    sendError('Incorrect email or password.', 401);
}

sendJson([
    'token' => createJwt(['sub' => (int) $user['id']]),
    'user' => publicUser($user),
]);
