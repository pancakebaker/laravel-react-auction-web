<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\IntegrationHeaders;
use App\Support\LiveFeedAdminTokenIssuer;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Throwable;

final class AdminLiveFeedSessionController extends Controller
{
    public function __invoke(Request $request, LiveFeedAdminTokenIssuer $issuer): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->is_admin, 403);

        try {
            $assertion = $issuer->issue($user);
            $baseUrl = rtrim((string) config('services.live_feed_admin.url'), '/');
            if ($baseUrl === '') {
                throw new \RuntimeException('Live Feed admin service URL is not configured.');
            }

            $response = $this->client($request)
                ->withToken($assertion['token'])
                ->post($baseUrl.'/admin/auth/system-token');

            $handoffCode = $response->json('handoffCode');
            if (! $response->successful() || ! is_string($handoffCode) || $handoffCode === '') {
                throw new \RuntimeException('Live Feed admin token exchange failed.');
            }

            return response()->json([
                'handoffUrl' => $baseUrl.'/admin/auth/handoff?code='.rawurlencode($handoffCode),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Live Feed administration is temporarily unavailable.',
            ], 503);
        }
    }

    private function client(Request $request): PendingRequest
    {
        $client = Http::acceptJson()
            ->timeout((int) config('services.live_feed_admin.timeout_seconds', 10));
        $correlationId = $request->header(IntegrationHeaders::CORRELATION_ID);
        if (is_string($correlationId) && $correlationId !== '') {
            $client = $client->withHeader(IntegrationHeaders::CORRELATION_ID, $correlationId);
        }

        return $client;
    }
}
