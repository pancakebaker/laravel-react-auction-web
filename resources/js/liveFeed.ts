/**
 * Socket.IO client adapter for subscribing to live auction updates from the live-feed service.
 */
import { io, type Socket } from 'socket.io-client';
import type {
    LiveAuctionClosed,
    LiveAuctionPurchased,
    LiveAuctionCancelled,
    LiveBidAccepted,
    LiveWinnerSelected,
    LiveAdminActivityDelta,
} from './types';
import { liveFeedSocketEvents } from './contracts/liveFeedTransport';

const liveFeedUrl = import.meta.env.VITE_LIVE_FEED_URL ?? 'http://localhost:3001';

/**
 * Callbacks invoked by the Socket.IO live-feed adapter as auction events arrive.
 */
export type LiveFeedHandlers = {
    onBidAccepted: (event: LiveBidAccepted) => void;
    onAuctionClosed: (event: LiveAuctionClosed) => void;
    onWinnerSelected: (event: LiveWinnerSelected) => void;
    onAuctionPurchased: (event: LiveAuctionPurchased) => void;
    onAuctionCancelled: (event: LiveAuctionCancelled) => void;
    onStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
};

/**
 * Connects to the live-feed service and subscribes the socket to one auction room.
 */
export function connectAuctionFeed(
    auctionId: string,
    tenantId: string,
    handlers: LiveFeedHandlers,
): Socket {
    const socket = io(liveFeedUrl, {
        transports: ['websocket'],
        reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
        handlers.onStatus('connected');
        socket.emit(liveFeedSocketEvents.subscribe, { auctionId, tenantId });
    });

    socket.io.on('reconnect_attempt', () => handlers.onStatus('reconnecting'));
    socket.on('disconnect', () => handlers.onStatus('offline'));
    socket.on('connect_error', () => handlers.onStatus('offline'));
    socket.on(liveFeedSocketEvents.bidAccepted, handlers.onBidAccepted);
    socket.on(liveFeedSocketEvents.auctionClosed, handlers.onAuctionClosed);
    socket.on(liveFeedSocketEvents.winnerSelected, handlers.onWinnerSelected);
    socket.on(liveFeedSocketEvents.auctionPurchased, handlers.onAuctionPurchased);
    socket.on(liveFeedSocketEvents.auctionCancelled, handlers.onAuctionCancelled);

    return socket;
}

/** Callbacks used by the tenant-wide admin activity Socket.IO adapter. */
export type AdminActivityFeedHandlers = {
    onDelta: (event: LiveAdminActivityDelta) => void;
    onStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
    onSubscription: (accepted: boolean) => void;
};

/** Connects one authenticated admin socket to the tenant-scoped activity stream. */
export function connectAdminActivityFeed(handlers: AdminActivityFeedHandlers): Socket {
    const socket = io(liveFeedUrl, {
        transports: ['websocket'],
        withCredentials: true,
        reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
        handlers.onStatus('connected');
        socket.emit(
            liveFeedSocketEvents.activitySubscribe,
            undefined,
            (response: { ok?: boolean }) => {
                handlers.onSubscription(response.ok === true);
            },
        );
    });
    socket.on(liveFeedSocketEvents.subscriptionError, () => {
        handlers.onSubscription(false);
    });
    socket.io.on('reconnect_attempt', () => handlers.onStatus('reconnecting'));
    socket.on('disconnect', () => handlers.onStatus('offline'));
    socket.on('connect_error', () => handlers.onStatus('offline'));
    socket.on(liveFeedSocketEvents.activityDelta, handlers.onDelta);

    return socket;
}
