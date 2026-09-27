<?php
require_once __DIR__ . '/config.php';

// Every endpoint includes this first. It lets the React dev server call the
// API, and answers the browser's preflight OPTIONS request before any
// endpoint logic runs. Only origins in CORS_ORIGINS (comma-separated) are
// echoed back — never "*".
$allowedOrigins = array_map('trim', explode(',', (string) config('CORS_ORIGINS')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
