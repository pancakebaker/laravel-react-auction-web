<?php

namespace App\Http\Controllers;

use App\Support\BiddingServiceClient;
use App\Support\BiddingServiceEndpoints;
use App\Support\IntegrationHeaders;
use Illuminate\Http\Request;

class AuctionCommandController extends Controller
{
    public function placeBid(
        Request $request,
        string $auction,
        BiddingServiceClient $client,
    ) {
        return $client->postCommand(
            $request->user(),
            $auction.'/'.BiddingServiceEndpoints::BIDS,
            $request->only(['amount']),
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }

    public function buyNow(
        Request $request,
        string $auction,
        BiddingServiceClient $client,
    ) {
        return $client->postCommand(
            $request->user(),
            $auction.'/'.BiddingServiceEndpoints::BUY_NOW,
            [],
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }
}
