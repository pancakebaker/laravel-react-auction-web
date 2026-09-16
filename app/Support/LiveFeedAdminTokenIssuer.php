<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Issues the dedicated SystemAdministrator assertion accepted by Live Feed.
 *
 * This issuer must remain separate from BiddingServiceTokenIssuer because the
 * two services intentionally validate different audiences and permissions.
 */
final class LiveFeedAdminTokenIssuer
{
    /** @return array{token: string, expiresAt: string, jti: string} */
    public function issue(User $user): array
    {
        $tenantId = app(TenantContext::class)->id();
        $userTenantId = strtolower(trim((string) $user->tenant_id));
        if ($userTenantId === '' || ! Str::isUuid($userTenantId) || $userTenantId !== $tenantId) {
            throw new RuntimeException('User tenant does not match the configured Laravel installation tenant.');
        }

        $issuer = trim((string) config('services.live_feed_admin.issuer'));
        $audience = trim((string) config('services.live_feed_admin.audience'));
        $keyId = trim((string) config('services.live_feed_admin.key_id'));
        $ttl = (int) config('services.live_feed_admin.ttl_seconds', 120);
        if ($issuer === '' || $audience === '' || $keyId === '' || $ttl < 60 || $ttl > 300) {
            throw new RuntimeException('Live Feed admin token configuration is incomplete or invalid.');
        }

        $privateKeyPath = (string) config('services.live_feed_admin.private_key_path');
        if (! $this->isAbsolutePath($privateKeyPath)) {
            $privateKeyPath = base_path($privateKeyPath);
        }

        $privateKey = @file_get_contents($privateKeyPath);
        if ($privateKey === false || $privateKey === '') {
            throw new RuntimeException('Live Feed admin signing key is not configured.');
        }

        $key = @openssl_pkey_get_private($privateKey);
        if ($key === false) {
            throw new RuntimeException('Live Feed admin signing key is invalid.');
        }

        $details = openssl_pkey_get_details($key);
        if (! is_array($details) || ($details['type'] ?? null) !== OPENSSL_KEYTYPE_RSA || ($details['bits'] ?? 0) < 2048) {
            throw new RuntimeException('Live Feed admin signing key must be an RSA key of at least 2048 bits.');
        }

        $issuedAt = time();
        $jti = (string) Str::uuid();
        $expiresAt = $issuedAt + $ttl;
        $claims = [
            'iss' => $issuer,
            'aud' => $audience,
            'sub' => $user->getSubjectId(),
            'role' => 'SystemAdministrator',
            'permissions' => ['livefeed.admin'],
            'tenant_id' => $tenantId,
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'jti' => $jti,
        ];

        $header = $this->encode(['alg' => 'RS256', 'typ' => 'JWT', 'kid' => $keyId]);
        $payload = $this->encode($claims);
        $input = $header.'.'.$payload;
        $signature = '';
        if (! openssl_sign($input, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Live Feed admin token signing failed.');
        }

        return [
            'token' => $input.'.'.$this->base64UrlEncode($signature),
            'expiresAt' => gmdate(DATE_ATOM, $expiresAt),
            'jti' => $jti,
        ];
    }

    /** @param array<string, mixed> $value */
    private function encode(array $value): string
    {
        return $this->base64UrlEncode((string) json_encode($value, JSON_THROW_ON_ERROR));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/')
            || str_starts_with($path, '\\')
            || (strlen($path) > 2 && ctype_alpha($path[0]) && $path[1] === ':');
    }
}
