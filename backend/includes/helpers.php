<?php
// Small shared helpers so every endpoint responds the same way.

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
