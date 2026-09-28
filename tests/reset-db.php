<?php
// DESTRUCTIVE: drops the configured database and re-creates it from
// backend/database/schema.sql. The test suites need an empty database.
// Uses the same settings as the backend (backend/config/local.php / env).
//
//   php tests/reset-db.php --yes

require __DIR__ . '/../backend/config/config.php';

$db = config('DB_NAME');
if (!in_array('--yes', $argv, true)) {
    fwrite(STDERR, "This DROPS the '$db' database and all its data. Re-run with --yes to confirm.\n");
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
echo "Reset '$db' to an empty schema.\n";
