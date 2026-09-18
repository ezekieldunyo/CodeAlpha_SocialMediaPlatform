<?php
// Database connection settings.
// Update these to match your local MySQL / XAMPP / WAMP setup.

define('DB_HOST', 'localhost');
define('DB_NAME', 'codealpha_social');
define('DB_USER', 'root');
define('DB_PASS', '');

// Secret key used to sign auth tokens. Change this to a long random string
// before deploying anywhere public.
define('JWT_SECRET', 'change-this-to-a-long-random-secret-key');

function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed.']);
            exit;
        }
    }
    return $pdo;
}
