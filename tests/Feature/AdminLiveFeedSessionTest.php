<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminLiveFeedSessionTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKeyPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->privateKeyPath = storage_path('testing-live-feed-admin-'.Str::uuid().'.pem');
        $this->generateKey($this->privateKeyPath);

        config()->set('services.live_feed_admin.url', 'http://localhost:3001');
        config()->set('services.live_feed_admin.issuer', 'dbap-system-admin');
        config()->set('services.live_feed_admin.audience', 'live-feed-admin');
        config()->set('services.live_feed_admin.key_id', 'system-admin-test-1');
        config()->set('services.live_feed_admin.private_key_path', $this->privateKeyPath);
        config()->set('services.live_feed_admin.ttl_seconds', 120);
    }

    protected function tearDown(): void
    {
        @unlink($this->privateKeyPath);
        parent::tearDown();
    }

    public function test_guest_cannot_initiate_handoff(): void
    {
        $this->postJson('/admin/live-feed/session')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_non_admin_cannot_initiate_handoff(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/admin/live-feed/session')
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_admin_exchange_uses_dedicated_claims_and_returns_only_handoff_url(): void
    {
        $request = null;
        Http::fake(function ($pendingRequest) use (&$request) {
            $request = $pendingRequest;

            return Http::response(['handoffCode' => 'opaque-code'], 200);
        });

        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)
            ->withHeader('X-Correlation-ID', 'correlation-1')
            ->postJson('/admin/live-feed/session');

        $response->assertOk()
            ->assertExactJson([
                'handoffUrl' => 'http://localhost:3001/admin/auth/handoff?code=opaque-code',
            ]);
        $response->assertJsonMissingPath('token');
        $response->assertJsonMissingPath('privateKey');
        $response->assertJsonMissingPath('tenant_id');
        $this->assertNotNull($request);
        $this->assertSame([], $request->data());
        $this->assertSame(['correlation-1'], $request->header('X-Correlation-ID'));

        $authorization = $request->header('Authorization')[0] ?? '';
        $this->assertStringStartsWith('Bearer ', $authorization);
        [$header, $claims] = $this->decode(substr($authorization, 7));
        $this->assertSame('RS256', $header['alg']);
        $this->assertSame('JWT', $header['typ']);
        $this->assertSame('system-admin-test-1', $header['kid']);
        $this->assertSame('dbap-system-admin', $claims['iss']);
        $this->assertSame('live-feed-admin', $claims['aud']);
        $this->assertSame($admin->getSubjectId(), $claims['sub']);
        $this->assertSame('SystemAdministrator', $claims['role']);
        $this->assertSame(['livefeed.admin'], $claims['permissions']);
        $this->assertSame(config('tenant.fallback_id'), $claims['tenant_id']);
        $this->assertSame(120, $claims['exp'] - $claims['iat']);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $claims['jti'],
        );
    }

    public function test_browser_tenant_input_cannot_override_trusted_tenant_claim(): void
    {
        Http::fake(['*' => Http::response(['handoffCode' => 'opaque-code'])]);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->postJson('/admin/live-feed/session', [
                'tenant_id' => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            ])
            ->assertOk();

        Http::assertSent(function ($request) {
            $authorization = $request->header('Authorization')[0] ?? '';
            [, $claims] = $this->decode(substr($authorization, 7));

            return $claims['tenant_id'] === config('tenant.fallback_id');
        });
    }

    public function test_exchange_failure_is_sanitized(): void
    {
        Http::fake(['*' => Http::response(['error' => 'internal details'], 401)]);
        $secretPath = $this->privateKeyPath;

        $response = $this->actingAs(User::factory()->admin()->create())
            ->postJson('/admin/live-feed/session');

        $response->assertStatus(503)
            ->assertExactJson(['message' => 'Live Feed administration is temporarily unavailable.'])
            ->assertJsonMissing(['internal details', $secretPath]);
    }

    public function test_missing_signing_key_fails_safely(): void
    {
        config()->set('services.live_feed_admin.private_key_path', storage_path('missing-live-feed-admin.pem'));

        $response = $this->actingAs(User::factory()->admin()->create())
            ->postJson('/admin/live-feed/session');

        $response->assertStatus(503)
            ->assertExactJson(['message' => 'Live Feed administration is temporarily unavailable.']);
        Http::assertNothingSent();
    }

    /** @return array{0: array<string, mixed>, 1: array<string, mixed>} */
    private function decode(string $token): array
    {
        $parts = explode('.', $token);

        return [
            json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true, 512, JSON_THROW_ON_ERROR),
            json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true, 512, JSON_THROW_ON_ERROR),
        ];
    }

    private function generateKey(string $path): void
    {
        $directory = dirname($path);
        if (! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }

        $process = proc_open(
            'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out '.escapeshellarg($path),
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
        );
        $exitCode = is_resource($process) ? proc_close($process) : 1;
        $this->assertSame(0, $exitCode);
    }
}
