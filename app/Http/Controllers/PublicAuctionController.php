<?php

namespace App\Http\Controllers;

use App\Support\BidderDisplayResolver;
use App\Support\BiddingServiceClient;
use App\Support\BiddingServiceEndpoints;
use App\Support\IntegrationHeaders;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PublicAuctionController extends Controller
{
    public function index(
        Request $request,
        BiddingServiceClient $client,
        BidderDisplayResolver $resolver,
    ) {
        return $this->present(
            $client->getPublicRead('', $request->header(IntegrationHeaders::CORRELATION_ID)),
            $resolver,
        );
    }

    public function show(
        Request $request,
        string $auction,
        BiddingServiceClient $client,
        BidderDisplayResolver $resolver,
    ) {
        return $this->present(
            $client->getPublicRead($auction, $request->header(IntegrationHeaders::CORRELATION_ID)),
            $resolver,
        );
    }

    public function bids(
        Request $request,
        string $auction,
        BiddingServiceClient $client,
        BidderDisplayResolver $resolver,
    ) {
        return $this->present(
            $client->getPublicRead(
                $auction.'/'.BiddingServiceEndpoints::BIDS,
                $request->header(IntegrationHeaders::CORRELATION_ID),
            ),
            $resolver,
        );
    }

    private function present(Response $response, BidderDisplayResolver $resolver): Response
    {
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return $response;
        }

        $payload = json_decode((string) $response->getContent(), true);
        if (! is_array($payload)) {
            return $response;
        }

        $records = array_is_list($payload) ? $payload : [$payload];
        $bidderIds = [];
        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }
            foreach (['currentBidderId', 'finalWinnerId', 'bidderId'] as $field) {
                if (isset($record[$field]) && is_string($record[$field])) {
                    $bidderIds[] = $record[$field];
                }
            }
        }

        $labels = $resolver->resolveMany($bidderIds);
        $presented = array_map(function (mixed $record) use ($labels): mixed {
            if (! is_array($record)) {
                return $record;
            }

            if (isset($record['currentBidderId']) && is_string($record['currentBidderId'])) {
                $record['currentBidderLabel'] = $labels[$record['currentBidderId']]
                    ?? null;
            }
            if (isset($record['finalWinnerId']) && is_string($record['finalWinnerId'])) {
                $record['finalWinnerLabel'] = $labels[$record['finalWinnerId']] ?? null;
            }
            if (isset($record['bidderId']) && is_string($record['bidderId'])) {
                $record['bidderLabel'] = $labels[$record['bidderId']] ?? null;
            }

            return $record;
        }, $records);

        $body = array_is_list($payload) ? $presented : ($presented[0] ?? []);
        $result = response()->json($body, $response->getStatusCode());
        foreach ($response->headers->all() as $name => $values) {
            $result->headers->set($name, $values);
        }

        return $result;
    }
}
