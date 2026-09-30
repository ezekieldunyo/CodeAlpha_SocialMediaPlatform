<?php
// DESTRUCTIVE, TEST DATABASE ONLY: drops the test database and re-creates it
// from backend/database/schema.sql, and deletes the test uploads. The test
// suites need this empty state.
//
// Settings come from the environment, the same way the test backend gets them
// (tests/run-all.sh sets DB_NAME=codealpha_social_test, UPLOADS_DIR=uploads-test).
// It refuses to touch a database whose name doesn't end in "_test", or the
// real uploads folder, so it can never wipe the app's own data.
//
//   DB_NAME=codealpha_social_test UPLOADS_DIR=uploads-test php tests/reset-db.php --yes

require __DIR__ . '/../backend/config/config.php';

$db = (string) config('DB_NAME');
$uploads = (string) config('UPLOADS_DIR');

// Guards come first, before --yes is even considered.
if (!preg_match('/^[A-Za-z0-9_]+_test$/', $db)) {
    fwrite(STDERR, "Refusing to reset '$db': only databases named *_test can be reset (set DB_NAME, e.g. codealpha_social_test).\n");
    exit(1);
}
if ($uploads === 'uploads' || !preg_match('/^[A-Za-z0-9_-]+-test$/', $uploads)) {
    fwrite(STDERR, "Refusing to clear the uploads folder '$uploads': set UPLOADS_DIR to a test folder ending in -test, e.g. uploads-test.\n");
    exit(1);
}
if (!in_array('--yes', $argv, true)) {
    fwrite(STDERR, "This DROPS the '$db' database and deletes backend/$uploads/. Re-run with --yes to confirm.\n");
    exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s', config('DB_HOST'), config('DB_PORT')),
    config('DB_USER'),
    config('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// schema.sql creates and USEs the app database by name. Point both statements
// at $db, and stop if they can't be found, rather than touch the real database.
$schema = file_get_contents(__DIR__ . '/../backend/database/schema.sql');
$schema = preg_replace('/^(CREATE DATABASE IF NOT EXISTS|USE)\s+`?codealpha_social`?/mi', "\$1 `$db`", $schema, -1, $replaced);
if ($replaced !== 2 || preg_match('/\bcodealpha_social\b(?!_test)/', $schema)) {
    fwrite(STDERR, "schema.sql doesn't have exactly the expected CREATE DATABASE / USE lines; not continuing.\n");
    exit(1);
}

$pdo->exec("DROP DATABASE IF EXISTS `$db`");
$pdo->exec($schema);

// Only files the upload endpoints create: 32 hex chars + image extension.
$removed = 0;
foreach (['posts', 'avatars'] as $sub) {
    foreach (glob(__DIR__ . "/../backend/$uploads/$sub/*") ?: [] as $file) {
        if (preg_match('/^[0-9a-f]{32}\.(jpg|png|gif|webp)$/', basename($file)) && unlink($file)) {
            $removed++;
        }
    }
}
echo "Reset '$db' to an empty schema and removed $removed test upload(s) from backend/$uploads/.\n";
