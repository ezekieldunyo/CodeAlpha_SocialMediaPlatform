<?php
// Stores images sent as data URLs on disk under backend/uploads/ and returns
// the public path the frontend can load them from.

require_once __DIR__ . '/response.php';

const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const UPLOAD_MIME_EXTENSIONS = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];

// Accepts either an existing "/uploads/..." path (unchanged image) or a
// "data:image/png;base64,...." payload, which gets written to disk.
function storeImage(?string $value, string $prefix): ?string {
    if ($value === null || $value === '') {
        return null;
    }
    if (str_starts_with($value, '/uploads/')) {
        return $value;
    }
    if (!preg_match('#^data:([a-z/+-]+);base64,(.+)$#is', $value, $matches)) {
        sendError('Image must be a base64 data URL.', 400);
    }

    $mime = strtolower($matches[1]);
    if (!isset(UPLOAD_MIME_EXTENSIONS[$mime])) {
        sendError('Unsupported image type. Use JPEG, PNG, GIF or WebP.', 400);
    }

    $binary = base64_decode($matches[2], true);
    if ($binary === false) {
        sendError('Image data is not valid base64.', 400);
    }
    if (strlen($binary) > UPLOAD_MAX_BYTES) {
        sendError('Image must be smaller than 2 MB.', 400);
    }

    $directory = __DIR__ . '/../uploads';
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        sendError('Could not store the uploaded image.', 500);
    }

    $filename = $prefix . '_' . bin2hex(random_bytes(8)) . '.' . UPLOAD_MIME_EXTENSIONS[$mime];
    if (file_put_contents("$directory/$filename", $binary) === false) {
        sendError('Could not store the uploaded image.', 500);
    }

    return "/uploads/$filename";
}
