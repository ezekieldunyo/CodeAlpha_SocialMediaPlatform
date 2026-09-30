<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/uploads.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

// Upload one image for a post (multipart/form-data, field "image"). Returns
// its URL, which the client then sends as image_url to posts/create.php.
requireAuth();
$url = handleImageUpload('image', 'posts');

jsonResponse(201, ['url' => $url]);
