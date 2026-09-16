import { describe, expect, it } from 'vitest';
import type { LiveAdminActivityDelta } from '../types';
import {
    applyActivityDelta,
    toUtcActivityDate,
    withFetchHandoffMode,
    type ActivityReport,
} from './adminActivityLiveFeed';

const report: ActivityReport = {
    from: '2026-09-10',
    to: '2026-09-16',
    days: 7,
    bids: [{ date: '2026-09-16', count: 0 }],
    purchases: [{ date: '2026-09-16', count: 0 }],
};

function delta(eventType: LiveAdminActivityDelta['eventType']): LiveAdminActivityDelta {
    return {
        eventId: `${eventType}-1`,
        eventType,
        tenantId: 'tenant-1',
        auctionId: 'auction-1',
        occurredAtUtc: '2026-09-16T23:30:00Z',
        aggregateVersion: 2,
        payload: {},
    };
}

describe('admin activity live-feed helpers', () => {
    it('maps timestamps to UTC calendar dates', () => {
        expect(toUtcActivityDate('2026-09-16T23:30:00Z')).toBe('2026-09-16');
    });

    it('increments distinct bid and purchase series', () => {
        const afterBid = applyActivityDelta(report, delta('BidAccepted'));
        const afterPurchase = applyActivityDelta(afterBid, delta('AuctionPurchased'));

        expect(afterPurchase.bids[0]?.count).toBe(1);
        expect(afterPurchase.purchases[0]?.count).toBe(1);
    });

    it('ignores deltas outside the report window', () => {
        const outside = { ...delta('BidAccepted'), occurredAtUtc: '2026-09-17T00:00:00Z' };

        expect(applyActivityDelta(report, outside)).toEqual(report);
    });

    it('adds fetch mode without losing the opaque handoff code', () => {
        const url = new URL(
            withFetchHandoffMode('http://localhost:3001/admin/auth/handoff?code=x'),
        );

        expect(url.searchParams.get('code')).toBe('x');
        expect(url.searchParams.get('mode')).toBe('fetch');
    });
});
