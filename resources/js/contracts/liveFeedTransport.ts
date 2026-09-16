/** Browser-facing Socket.IO identifiers shared with the live-feed service. */
export const liveFeedSocketEvents = {
    bidAccepted: 'bid:accepted',
    auctionClosed: 'auction:closed',
    winnerSelected: 'winner:selected',
    auctionPurchased: 'auction:purchased',
    auctionCancelled: 'auction:cancelled',
    subscribe: 'auction:subscribe',
    unsubscribe: 'auction:unsubscribe',
    activitySubscribe: 'admin:activity:subscribe',
    activityUnsubscribe: 'admin:activity:unsubscribe',
    activityDelta: 'admin:activity:delta',
    subscriptionError: 'subscription:error',
} as const;
