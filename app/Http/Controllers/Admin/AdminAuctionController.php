<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdminNavigation;
use App\Support\AdminResponse;
use App\Support\BiddingServiceClient;
use App\Support\BiddingServiceEndpoints;
use App\Support\IntegrationHeaders;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminAuctionController extends Controller
{
    /**
     * Render the Bidding Service-backed auction management surface.
     */
    public function __invoke(Request $request): View|JsonResponse
    {
        return AdminResponse::make($request, [
            'page' => 'auctions',
            'navigation' => AdminNavigation::for('auctions'),
            'props' => [],
        ]);
    }

    public function create(Request $request, BiddingServiceClient $client): Response
    {
        return $client->postCommand(
            $request->user(),
            '',
            $request->only([
                'title', 'description', 'saleMode', 'startingPrice',
                'minimumBidIncrement', 'buyNowPrice', 'startTimeUtc', 'endTimeUtc',
            ]),
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }

    public function update(string $auction, Request $request, BiddingServiceClient $client): Response
    {
        return $client->putCommand(
            $request->user(),
            $auction,
            $request->only([
                'title', 'description', 'saleMode', 'startingPrice',
                'minimumBidIncrement', 'buyNowPrice', 'startTimeUtc', 'endTimeUtc', 'version',
            ]),
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }

    public function delete(string $auction, Request $request, BiddingServiceClient $client): Response
    {
        return $client->deleteCommand(
            $request->user(),
            $auction,
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }

    public function cancel(string $auction, Request $request, BiddingServiceClient $client): Response
    {
        return $client->postCommand(
            $request->user(),
            $auction.'/'.BiddingServiceEndpoints::CANCEL,
            $request->only(['version']),
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }
}
