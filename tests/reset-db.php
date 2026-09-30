<?php
// DESTRUCTIVE: drops the configured database and re-creates it from
// backend/database/schema.sql, and deletes uploaded images in
// backend/uploads/{posts,avatars}/ (they belong to the posts and profiles that
// were just dropped). The test suites need this empty state.
// Uses the same settings as the backend (backend/config/local.php / env).
//
//   php tests/reset-db.php --yes

require __DIR__ . '/../backend/config/config.php';

$db = config('DB_NAME');
if (!in_array('--yes', $argv, true)) {
    fwrite(STDERR, "This DROPS the '$db' database and deletes all uploaded images. Re-run with --yes to confirm.\n");
    exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s', config('DB_HOST'), config('DB_PORT')),
    config('DB_USER'),
    config('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$pdo->exec("DROP DATABASE IF EXISTS `$db`");
$pdo->exec(file_get_contents(__DIR__ . '/../backend/database/schema.sql'));

// Only the files the upload endpoints create: 32 hex chars + image extension.
$removed = 0;
foreach (['posts', 'avatars'] as $dir) {
    foreach (glob(__DIR__ . "/../backend/uploads/$dir/*") ?: [] as $file) {
        if (preg_match('/^[0-9a-f]{32}\.(jpg|png|gif|webp)$/', basename($file)) && unlink($file)) {
            $removed++;
        }
    }
}
echo "Reset '$db' to an empty schema and removed $removed uploaded image(s).\n";
