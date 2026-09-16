<?php

namespace App\Http\Controllers;

use App\Support\BiddingServiceClient;
use App\Support\BiddingServiceEndpoints;
use App\Support\IntegrationHeaders;
use Illuminate\Http\Request;

class PublicAuctionController extends Controller
{
    public function index(Request $request, BiddingServiceClient $client)
    {
        return $client->getPublicRead('', $request->header(IntegrationHeaders::CORRELATION_ID));
    }

    public function show(Request $request, string $auction, BiddingServiceClient $client)
    {
        return $client->getPublicRead($auction, $request->header(IntegrationHeaders::CORRELATION_ID));
    }

    public function bids(Request $request, string $auction, BiddingServiceClient $client)
    {
        return $client->getPublicRead(
            $auction.'/'.BiddingServiceEndpoints::BIDS,
            $request->header(IntegrationHeaders::CORRELATION_ID),
        );
    }
}
