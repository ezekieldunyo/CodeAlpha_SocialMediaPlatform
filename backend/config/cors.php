<?php
// Allow the React dev server (Vite default port) to call this API.
// Add your production frontend URL here too when you deploy.
$allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Browsers send a preflight OPTIONS request before real requests; just
// acknowledge it and stop.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
