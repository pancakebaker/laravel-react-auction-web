<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdminBootstrapData;
use App\Support\BiddingServiceClient;
use App\Support\IntegrationHeaders;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AdminActivityReportController extends Controller
{
    public function __invoke(Request $request, BiddingServiceClient $biddingService): JsonResponse
    {
        $report = AdminBootstrapData::activityReport(
            $biddingService,
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );

        if ($report === null) {
            return response()->json(['message' => 'Activity data unavailable.'], 503);
        }

        return response()->json($report);
    }
}
