<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

$data = getJsonBody();
requireFields($data, ['username', 'email', 'password', 'display_name']);

$username = trim($data['username']);
$email = trim($data['email']);
$password = $data['password'];
$displayName = trim($data['display_name']);

if (!isValidUsername($username)) {
    jsonError(400, 'Username must be 3-30 characters: letters, numbers, or underscore only.');
}
if (!isValidEmail($email)) {
    jsonError(400, 'Please provide a valid email address.');
}
if (strlen($password) < 8) {
    jsonError(400, 'Password must be at least 8 characters.');
}
if (strlen($displayName) < 1 || strlen($displayName) > 60) {
    jsonError(400, 'Display name must be between 1 and 60 characters.');
}

$pdo = getDbConnection();

// Check for existing username/email before inserting.
$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
$stmt->execute([$username, $email]);
if ($stmt->fetch()) {
    jsonError(409, 'That username or email is already taken.');
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare(
    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$username, $email, $passwordHash, $displayName]);
$userId = (int) $pdo->lastInsertId();

$token = createJwt(['user_id' => $userId]);

jsonResponse(201, [
    'token' => $token,
    'user' => [
        'id' => $userId,
        'username' => $username,
        'email' => $email,
        'display_name' => $displayName,
        'bio' => '',
        'avatar_url' => null,
    ],
]);
