<?php
require_once __DIR__ . '/config.php';

// One shared PDO connection per request. Real prepared statements (no
// emulation) and exceptions on error, so SQL failures never pass silently.
function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            config('DB_HOST'),
            config('DB_PORT'),
            config('DB_NAME')
        );

        try {
            $pdo = new PDO($dsn, config('DB_USER'), config('DB_PASS'), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                // created_at values come back in UTC wherever the database server
                // is, so the frontend can show them in each visitor's own time.
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
            ]);
        } catch (PDOException $e) {
            error_log('DB connection failed: ' . $e->getMessage());
            jsonError(500, 'Database connection failed.');
        }
    }

    return $pdo;
}
