<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/uploads.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed.');
}

// Upload a profile photo (multipart/form-data, field "image"). Same checks as
// posts/upload_image.php. Returns its URL; the client saves it as avatar_url
// through users/update_profile.php when the profile form is submitted.
requireAuth();
$url = handleImageUpload('image', 'avatars');

jsonResponse(201, ['url' => $url]);
