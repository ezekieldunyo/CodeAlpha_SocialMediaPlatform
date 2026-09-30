<?php
// Small shared helpers so every endpoint responds the same way.

// Errors must never reach the client as HTML. With display_errors on (as in
// Laravel Herd and php -S), an uncaught error used to print an HTML page with
// status 200, which the frontend read as success. Now every failure is logged
// and answered with a JSON error and a 500.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false; // suppressed with @ (e.g. the image checks in uploads.php)
    }
    if ($severity & (E_DEPRECATED | E_USER_DEPRECATED)) {
        error_log("Deprecated: $message in $file:$line");
        return true;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function (Throwable $e): void {
    error_log('Unhandled ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        jsonError(500, 'Something went wrong on the server. Please try again.');
    }
});

// Fatal errors (e.g. running out of memory) skip the handlers above.
register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error && ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR)) && !headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Something went wrong on the server. Please try again.']);
    }
});

function jsonResponse(int $status, array $data): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function jsonError(int $status, string $message): void {
    jsonResponse($status, ['error' => $message]);
}

// Reads and decodes the JSON request body. Returns [] if empty/invalid.
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Ensures each key in $required is present and non-empty in $data.
// Sends a 400 error and exits if anything is missing.
function requireFields(array $data, array $required): void {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    if ($missing) {
        jsonError(400, 'Missing required field(s): ' . implode(', ', $missing));
    }
}

function isValidEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Basic username rule: 3-30 chars, letters/numbers/underscore only.
function isValidUsername(string $username): bool {
    return (bool) preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username);
}
