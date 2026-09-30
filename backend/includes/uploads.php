<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/../config/config.php';

// Shared image upload handling for posts/upload_image.php and
// users/upload_avatar.php.
//
// A file is accepted only if its *contents* are a real JPEG, PNG, GIF or
// WebP: the detected MIME type, the image header and a full decode must all
// agree. The client's filename and extension are ignored entirely; the saved
// name is random and the extension comes from the detected type, so uploads
// can't overwrite each other or be stored as anything executable.

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const UPLOAD_MAX_PIXELS = 40000000;         // 40 megapixels, keeps the decode check within memory
const UPLOAD_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];

// The limit actually in force: our 5 MB, unless PHP's own upload limit is
// lower (it drops bigger files before this code runs). See backend/.user.ini.
function uploadLimitBytes(): int {
    return min(UPLOAD_MAX_BYTES, iniBytes((string) ini_get('upload_max_filesize')));
}

function uploadTooLarge(): void {
    $mb = rtrim(rtrim(number_format(uploadLimitBytes() / (1024 * 1024), 1), '0'), '.');
    jsonError(413, "That image is too large. The maximum size is $mb MB.");
}

// "8M" -> 8388608, as used by post_max_size / upload_max_filesize.
function iniBytes(string $value): int {
    $value = trim($value);
    $number = (int) $value;
    switch (strtoupper(substr($value, -1))) {
        case 'G': return $number * 1024 ** 3;
        case 'M': return $number * 1024 ** 2;
        case 'K': return $number * 1024;
        default: return $number;
    }
}

// Validates the uploaded file in $_FILES[$field], stores it under
// backend/uploads/$subdir/ and returns its public URL. Sends a JSON error and
// exits on any problem.
function handleImageUpload(string $field, string $subdir): string {
    // A body larger than post_max_size is discarded by PHP before we run, so
    // $_FILES is simply empty; the Content-Length header still tells us why.
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if (empty($_FILES) && $contentLength > iniBytes((string) ini_get('post_max_size'))) {
        uploadTooLarge();
    }

    if (!isset($_FILES[$field])) {
        jsonError(400, "No image uploaded. Send the file in a multipart form field named '$field'.");
    }
    $file = $_FILES[$field];
    if (is_array($file['error'])) {
        jsonError(400, 'Upload one image at a time.');
    }

    switch ($file['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            uploadTooLarge();
        case UPLOAD_ERR_NO_FILE:
            jsonError(400, 'No image uploaded.');
        case UPLOAD_ERR_PARTIAL:
            jsonError(400, 'The upload was interrupted. Please try again.');
        default:
            error_log('Upload failed with PHP error code ' . $file['error']);
            jsonError(500, 'The server could not receive the upload.');
    }

    if ($file['size'] > UPLOAD_MAX_BYTES) {
        uploadTooLarge();
    }
    if ($file['size'] === 0) {
        jsonError(400, 'The uploaded file is empty.');
    }
    $tmp = $file['tmp_name'];
    if (!is_uploaded_file($tmp)) {
        jsonError(400, 'No image uploaded.');
    }

    // 1. MIME type sniffed from the bytes (not the name or the browser's claim).
    $notAnImage = "That file isn't a supported image. Please upload a JPEG, PNG, GIF or WebP.";
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if (!isset(UPLOAD_TYPES[$mime])) {
        jsonError(415, $notAnImage);
    }

    // 2. The image header must parse and agree with the sniffed type.
    $info = @getimagesize($tmp);
    if (!$info || $info[0] < 1 || $info[1] < 1 || image_type_to_mime_type($info[2]) !== $mime) {
        jsonError(415, $notAnImage);
    }
    if ($info[0] * $info[1] > UPLOAD_MAX_PIXELS) {
        jsonError(413, 'That image has too many pixels. The maximum is 40 megapixels.');
    }

    // 3. It must fully decode. This catches a valid-looking header followed by
    //    junk, which steps 1 and 2 alone would let through.
    ini_set('memory_limit', '256M');
    $image = @imagecreatefromstring((string) file_get_contents($tmp));
    if ($image === false) {
        jsonError(415, $notAnImage);
    }
    unset($image);

    $dir = __DIR__ . '/../' . uploadsDir() . '/' . $subdir;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        error_log("Could not create upload directory $dir");
        jsonError(500, 'The server could not store the upload.');
    }

    // 128 random bits: unguessable and effectively collision-free.
    $name = bin2hex(random_bytes(16)) . '.' . UPLOAD_TYPES[$mime];
    if (!move_uploaded_file($tmp, "$dir/$name")) {
        error_log("Could not move upload to $dir/$name");
        jsonError(500, 'The server could not store the upload.');
    }

    return publicUploadUrl("$subdir/$name");
}

// Folder name under backend/ that holds uploads (config UPLOADS_DIR). Kept to a
// plain name so it can never point outside the backend.
function uploadsDir(): string {
    $dir = (string) config('UPLOADS_DIR');
    return preg_match('/^[A-Za-z0-9_-]+$/', $dir) ? $dir : 'uploads';
}

// Absolute URL for an uploaded file. Set UPLOADS_URL in config to
// override (e.g. behind a CDN); otherwise it's derived from this request, so
// it works for http://backend.test, php -S and sub-folder installs alike.
function publicUploadUrl(string $relativePath): string {
    $base = config('UPLOADS_URL');
    if (!$base) {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        // /api/posts/upload_image.php -> site root is three levels up.
        $root = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/', 3)), '/');
        $base = ($https ? 'https' : 'http') . "://$host$root/" . uploadsDir();
    }
    return rtrim($base, '/') . '/' . $relativePath;
}
