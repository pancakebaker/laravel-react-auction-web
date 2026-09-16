/** Presentation helpers for converting opaque bidder subjects into safe labels. */
import type { AuctionSummary, Bid } from '../../types';

/** Presentation-only bidder labels; bidder IDs remain authoritative identities. */
export type BidderLabelMap = Record<string, string>;

/** Remembers display labels received from authoritative REST responses. */
export function rememberBidderLabels(
    map: BidderLabelMap,
    auction: Pick<
        AuctionSummary,
        'currentBidderId' | 'currentBidderLabel' | 'finalWinnerId' | 'finalWinnerLabel'
    >,
    bids: Bid[],
): BidderLabelMap {
    const next = { ...map };
    add(next, auction.currentBidderId, auction.currentBidderLabel);
    add(next, auction.finalWinnerId, auction.finalWinnerLabel);
    bids.forEach((bid) => add(next, bid.bidderId, bid.bidderLabel));
    return next;
}

/** Resolves a bidder ID to a known, legacy-compatible, or shortened safe label. */
export function bidderLabel(
    bidderId: string,
    labels: BidderLabelMap = {},
    currentUser?: { subjectId: string | null; displayName: string | null },
): string {
    const known = labels[bidderId.toLowerCase()];
    if (known) return known;

    if (
        currentUser?.subjectId?.toLowerCase() === bidderId.toLowerCase() &&
        currentUser.displayName
    ) {
        return currentUser.displayName;
    }

    if (!looksLikeUuid(bidderId)) {
        return bidderId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return `Bidder ${bidderId.slice(0, 8)}`;
}

function add(map: BidderLabelMap, id: string | null, label?: string | null) {
    if (id && label) map[id.toLowerCase()] = label;
}

function looksLikeUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
