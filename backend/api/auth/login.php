<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

$data = getJsonBody();
requireFields($data, ['email', 'password']);

$email = trim($data['email']);
$password = $data['password'];

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT id, username, email, password_hash, display_name, bio, avatar_url FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

// Same error for "no such user" and "wrong password" — don't reveal
// which one it was, that just helps someone enumerate valid emails.
if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonError(401, 'Invalid email or password.');
}

$token = createJwt(['user_id' => (int) $user['id']]);

jsonResponse(200, [
    'token' => $token,
    'user' => [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'display_name' => $user['display_name'],
        'bio' => $user['bio'],
        'avatar_url' => $user['avatar_url'],
    ],
]);
