<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/posts.php';
require_once __DIR__ . '/../../includes/uploads.php';

requireMethod('POST');

$user = requireUser();
$body = readJsonBody();
$content = requireString($body, 'content', 1, 1000);
$imageUrl = storeImage(optionalString($body, 'image', 3_000_000), 'post');

$pdo = getDbConnection();
$stmt = $pdo->prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
$stmt->execute([(int) $user['id'], $content, $imageUrl]);
$postId = (int) $pdo->lastInsertId();

$stmt = $pdo->prepare(postSelectSql() . ' WHERE p.id = ?');
$stmt->execute([(int) $user['id'], $postId]);

sendJson(['post' => shapePost($stmt->fetch())], 201);
