<?php
require_once __DIR__ . '/../config/config.php';

// Minimal HS256 JWT implementation — enough for signing and verifying our
// own tokens without pulling in a Composer dependency.

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string|false {
    $padded = str_pad(strtr($data, '-_', '+/'), (int) ceil(strlen($data) / 4) * 4, '=');
    return base64_decode($padded, true);
}

function createJwt(array $claims): string {
    $now = time();
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = array_merge($claims, [
        'iat' => $now,
        'exp' => $now + (int) config('JWT_TTL'),
    ]);

    $segments = base64UrlEncode(json_encode($header)) . '.' . base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', $segments, config('JWT_SECRET'), true);

    return $segments . '.' . base64UrlEncode($signature);
}

// Returns the decoded payload, or null if the token is malformed, has a bad
// signature, or has expired.
function verifyJwt(?string $token): ?array {
    if (!$token) {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerB64, $payloadB64, $signatureB64] = $parts;

    $header = json_decode((string) base64UrlDecode($headerB64), true);
    if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256') {
        return null;
    }

    $expected = hash_hmac('sha256', "$headerB64.$payloadB64", config('JWT_SECRET'), true);
    $signature = base64UrlDecode($signatureB64);
    if ($signature === false || !hash_equals($expected, $signature)) {
        return null;
    }

    $payload = json_decode((string) base64UrlDecode($payloadB64), true);
    if (!is_array($payload) || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

// Pulls the token out of "Authorization: Bearer <token>". Apache sometimes
// strips that header from $_SERVER, so fall back to getallheaders().
function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;

    if (!$header && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    if ($header && preg_match('/^Bearer\s+(\S+)$/i', trim($header), $matches)) {
        return $matches[1];
    }
    return null;
}
