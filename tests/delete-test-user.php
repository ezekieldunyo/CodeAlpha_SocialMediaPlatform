<?php
// Deletes one user from the TEST database, to simulate an account that
// disappears while a browser is still logged in. Used by the regression tests.
// Refuses unless DB_NAME ends in "_test" (tests/run-all.sh sets it).
//
//   DB_NAME=codealpha_social_test php tests/delete-test-user.php <username>

require __DIR__ . '/../backend/config/config.php';

$db = (string) config('DB_NAME');
if (!preg_match('/^[A-Za-z0-9_]+_test$/', $db)) {
    fwrite(STDERR, "Refusing: '$db' is not a *_test database.\n");
    exit(1);
}
$username = $argv[1] ?? '';
if ($username === '') {
    fwrite(STDERR, "usage: php delete-test-user.php <username>\n");
    exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s', config('DB_HOST'), config('DB_PORT'), $db),
    config('DB_USER'),
    config('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$stmt = $pdo->prepare('DELETE FROM users WHERE username = ?');
$stmt->execute([$username]);
echo $stmt->rowCount(), "\n";
