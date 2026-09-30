<?php
// App settings. Values come from environment variables first, then from an
// optional config/local.php (gitignored) that returns an array of overrides.
// Copy local.example.php to local.php to set your own.

function config(string $key) {
    static $settings = null;

    if ($settings === null) {
        $settings = [
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_NAME' => 'codealpha_social',
            'DB_USER' => 'root',
            'DB_PASS' => '',
            'JWT_SECRET' => 'change-me-in-config-local-php',
            'JWT_TTL' => 60 * 60 * 24 * 7, // 7 days
            'CORS_ORIGINS' => 'http://localhost:5173,http://127.0.0.1:5173',
            // Folder under backend/ for uploaded images (the tests use uploads-test).
            'UPLOADS_DIR' => 'uploads',
            // Public base URL of that folder. Empty = derived from the request.
            'UPLOADS_URL' => '',
        ];

        $localFile = __DIR__ . '/local.php';
        if (is_file($localFile)) {
            $settings = array_merge($settings, require $localFile);
        }

        foreach ($settings as $name => $default) {
            $fromEnv = getenv($name);
            if ($fromEnv !== false) {
                $settings[$name] = $fromEnv;
            }
        }
    }

    return $settings[$key] ?? null;
}
