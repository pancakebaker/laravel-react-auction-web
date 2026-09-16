import { describe, expect, it } from 'vitest';
import { bidderLabel, rememberBidderLabels } from './bidder';

describe('bidder presentation', () => {
    it('prefers a trusted display name for a bidder subject', () => {
        expect(
            bidderLabel('64b29e32-1308-4dba-b533-58ac885fa0be', {
                '64b29e32-1308-4dba-b533-58ac885fa0be': 'Bidder Two',
            }),
        ).toBe('Bidder Two');
    });

    it('normalizes legacy demo labels and shortens unknown UUIDs', () => {
        expect(bidderLabel('carol')).toBe('Carol');
        expect(bidderLabel('64b29e32-1308-4dba-b533-58ac885fa0be')).toBe('Bidder 64b29e32');
    });

    it('shares labels learned from REST with later live updates', () => {
        const labels = rememberBidderLabels(
            {},
            {
                currentBidderId: '64b29e32-1308-4dba-b533-58ac885fa0be',
                currentBidderLabel: 'Bidder Two',
                finalWinnerId: null,
                finalWinnerLabel: null,
            },
            [],
        );

        expect(bidderLabel('64B29E32-1308-4DBA-B533-58AC885FA0BE', labels)).toBe('Bidder Two');
    });
});
