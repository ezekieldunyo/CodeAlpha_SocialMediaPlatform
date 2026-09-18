<?php
// Minimal JWT (HS256) implementation so we don't need composer/packagist
// access just to sign a login token. Good enough for this project; for a
// production app prefer a maintained library like firebase/php-jwt.

require_once __DIR__ . '/../config/database.php';

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    $padded = str_pad($data, strlen($data) % 4 === 0 ? strlen($data) : strlen($data) + 4 - strlen($data) % 4, '=');
    return base64_decode(strtr($padded, '-_', '+/'));
}

function createJwt(array $payload, int $expiresInSeconds = 604800): string {
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $expiresInSeconds; // default: 7 days

    $segments = [
        base64UrlEncode(json_encode($header)),
        base64UrlEncode(json_encode($payload)),
    ];
    $signature = hash_hmac('sha256', implode('.', $segments), JWT_SECRET, true);
    $segments[] = base64UrlEncode($signature);

    return implode('.', $segments);
}

// Returns the decoded payload array, or null if the token is missing,
// malformed, expired, or has a bad signature.
function verifyJwt(?string $token): ?array {
    if (!$token || substr_count($token, '.') !== 2) {
        return null;
    }
    [$headerB64, $payloadB64, $sigB64] = explode('.', $token);

    $expectedSig = hash_hmac('sha256', "$headerB64.$payloadB64", JWT_SECRET, true);
    if (!hash_equals(base64UrlEncode($expectedSig), $sigB64)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

// Reads the Bearer token from the Authorization header.
function getBearerToken(): ?string {
    $headers = getallheaders();
    foreach ($headers as $name => $value) {
        if (strtolower($name) === 'authorization' && stripos($value, 'Bearer ') === 0) {
            return trim(substr($value, 7));
        }
    }
    return null;
}
