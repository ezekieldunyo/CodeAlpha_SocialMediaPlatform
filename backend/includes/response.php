<?php
// Shared helpers for JSON responses and server-side input validation.

function sendJson(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function sendError(string $message, int $status = 400): void {
    sendJson(['error' => $message], $status);
}

// Reads and decodes the JSON request body. Falls back to form-encoded input
// so the endpoints still work from a plain HTML form or curl -d.
function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        parse_str($raw, $parsed);
        return is_array($parsed) ? $parsed : [];
    }
    return $decoded;
}

function requireMethod(string ...$methods): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        sendError('Method not allowed.', 405);
    }
}

// Returns a trimmed string field, or null when absent.
function field(array $body, string $key): ?string {
    if (!array_key_exists($key, $body) || !is_scalar($body[$key])) {
        return null;
    }
    return trim((string) $body[$key]);
}

function requireString(array $body, string $key, int $min, int $max): string {
    $value = field($body, $key);
    if ($value === null || $value === '') {
        sendError("Field '$key' is required.", 400);
    }
    $length = mb_strlen($value);
    if ($length < $min) {
        sendError("Field '$key' must be at least $min characters.", 400);
    }
    if ($length > $max) {
        sendError("Field '$key' must be at most $max characters.", 400);
    }
    return $value;
}

function optionalString(array $body, string $key, int $max): ?string {
    $value = field($body, $key);
    if ($value === null) {
        return null;
    }
    if (mb_strlen($value) > $max) {
        sendError("Field '$key' must be at most $max characters.", 400);
    }
    return $value;
}

function requireEmail(array $body, string $key): string {
    $value = requireString($body, $key, 3, 120);
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
        sendError("Field '$key' must be a valid email address.", 400);
    }
    return strtolower($value);
}

function requireId(array $source, string $key): int {
    $value = $source[$key] ?? null;
    if ($value === null || $value === '' || !ctype_digit((string) $value) || (int) $value < 1) {
        sendError("Field '$key' must be a positive integer.", 400);
    }
    return (int) $value;
}

function optionalPage(array $source, string $key = 'page'): int {
    $value = $source[$key] ?? '1';
    if (!ctype_digit((string) $value) || (int) $value < 1) {
        return 1;
    }
    return (int) $value;
}
