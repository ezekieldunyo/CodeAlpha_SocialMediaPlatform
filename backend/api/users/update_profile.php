<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';

if (requestMethod() !== 'PUT') {
    jsonError(405, 'Method not allowed.');
}

$userId = requireAuth();
$data = getJsonBody();

// All fields optional here — only update what's provided.
$displayName = isset($data['display_name']) ? trim($data['display_name']) : null;
$bio = isset($data['bio']) ? trim($data['bio']) : null;
$avatarUrl = isset($data['avatar_url']) ? trim($data['avatar_url']) : null;

if ($displayName !== null && ($displayName === '' || strlen($displayName) > 60)) {
    jsonError(400, 'Display name must be between 1 and 60 characters.');
}
if ($bio !== null && strlen($bio) > 280) {
    jsonError(400, 'Bio must be 280 characters or fewer.');
}

$pdo = getDbConnection();

$fields = [];
$values = [];
if ($displayName !== null) { $fields[] = 'display_name = ?'; $values[] = $displayName; }
if ($bio !== null)         { $fields[] = 'bio = ?';          $values[] = $bio; }
if ($avatarUrl !== null)   { $fields[] = 'avatar_url = ?';   $values[] = $avatarUrl; }

if (!$fields) {
    jsonError(400, 'Nothing to update — provide display_name, bio, and/or avatar_url.');
}

$values[] = $userId;
$stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?');
$stmt->execute($values);

$stmt = $pdo->prepare('SELECT id, username, display_name, bio, avatar_url FROM users WHERE id = ?');
$stmt->execute([$userId]);

$user = $stmt->fetch();
if (!$user) {
    // Account deleted while this request was running.
    jsonError(401, 'Your session has ended. Please log in again.');
}
$user['id'] = (int) $user['id'];

jsonResponse(200, ['user' => $user]);
