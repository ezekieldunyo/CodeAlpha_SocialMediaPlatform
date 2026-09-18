<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/uploads.php';

requireMethod('PUT', 'POST');

$user = requireUser();
$body = readJsonBody();

$displayName = optionalString($body, 'display_name', 60);
$bio = optionalString($body, 'bio', 280);
$avatar = optionalString($body, 'avatar', 3_000_000) ?? optionalString($body, 'avatar_url', 3_000_000);

if ($displayName === null && $bio === null && $avatar === null) {
    sendError('Provide at least one of display_name, bio or avatar.', 400);
}
if ($displayName !== null && $displayName === '') {
    sendError("Field 'display_name' is required.", 400);
}

$updates = [];
$params = [];
if ($displayName !== null) {
    $updates[] = 'display_name = ?';
    $params[] = $displayName;
}
if ($bio !== null) {
    $updates[] = 'bio = ?';
    $params[] = $bio;
}
if ($avatar !== null) {
    $updates[] = 'avatar_url = ?';
    $params[] = $avatar === '' ? null : storeImage($avatar, 'avatar');
}
$params[] = (int) $user['id'];

$pdo = getDbConnection();
$stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?');
$stmt->execute($params);

$stmt = $pdo->prepare(
    'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE id = ?'
);
$stmt->execute([(int) $user['id']]);

sendJson(['user' => publicUser($stmt->fetch())]);
