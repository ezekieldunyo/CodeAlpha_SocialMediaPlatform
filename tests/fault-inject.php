<?php
// TEST DATABASE ONLY: breaks and restores parts of the schema so the suites can
// reproduce real failures, e.g. the 2026-09-30 bug where posting failed after
// the post was saved because the reposts table was missing.
//
//   drop-reposts           DROP TABLE reposts
//   restore-reposts        re-create it from backend/database/schema.sql
//   drop-client-token      remove posts.client_token (a database not yet migrated)
//   restore-client-token   add it back from database/migrations/001_posts_client_token.sql
//
// Like reset-db.php, it refuses any database whose name doesn't end in "_test".
//   DB_NAME=codealpha_social_test php tests/fault-inject.php drop-reposts

require __DIR__ . '/../backend/config/config.php';

$db = (string) config('DB_NAME');
if (!preg_match('/^[A-Za-z0-9_]+_test$/', $db)) {
    fwrite(STDERR, "Refusing to change '$db': only databases named *_test (set DB_NAME, e.g. codealpha_social_test).\n");
    exit(1);
}

$action = $argv[1] ?? '';
switch ($action) {
    case 'drop-reposts':
        $sql = 'DROP TABLE IF EXISTS reposts';
        break;
    case 'restore-reposts':
        $schema = file_get_contents(__DIR__ . '/../backend/database/schema.sql');
        if (!preg_match('/CREATE TABLE IF NOT EXISTS reposts \(.*?\) ENGINE=InnoDB;/s', $schema, $m)) {
            fwrite(STDERR, "reposts table not found in schema.sql\n");
            exit(1);
        }
        $sql = $m[0];
        break;
    case 'drop-client-token':
        $sql = 'ALTER TABLE posts DROP INDEX unique_post_client_token, DROP COLUMN client_token';
        break;
    case 'restore-client-token':
        $sql = preg_replace('/^\s*--.*$/m', '', file_get_contents(__DIR__ . '/../backend/database/migrations/001_posts_client_token.sql'));
        break;
    default:
        fwrite(STDERR, "Usage: php tests/fault-inject.php drop-reposts|restore-reposts|drop-client-token|restore-client-token\n");
        exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s', config('DB_HOST'), config('DB_PORT'), $db),
    config('DB_USER'),
    config('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$pdo->exec($sql);
echo "$action: done on '$db'\n";
