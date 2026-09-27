<?php
require_once __DIR__ . '/config.php';

// Every endpoint includes this first. It lets the Vite dev server call the
// API, and answers the browser's preflight OPTIONS request before any
// endpoint logic runs.
header('Access-Control-Allow-Origin: ' . config('CORS_ORIGIN'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
