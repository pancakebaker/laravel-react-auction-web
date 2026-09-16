/** Tests for the browser Socket.IO adapters used by public and admin surfaces. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { liveFeedSocketEvents } from './contracts/liveFeedTransport';

type EventHandler = (...args: unknown[]) => void;

const handlers = new Map<string, EventHandler>();
const managerHandlers = new Map<string, EventHandler>();
const emit = vi.fn();
const socket = {
    emit,
    io: {
        on: vi.fn((event: string, handler: EventHandler) => managerHandlers.set(event, handler)),
    },
    on: vi.fn((event: string, handler: EventHandler) => {
        handlers.set(event, handler);
        return socket;
    }),
};

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => socket),
}));

import { connectAdminActivityFeed } from './liveFeed';
import { io } from 'socket.io-client';

describe('admin live-feed Socket.IO adapter', () => {
    beforeEach(() => {
        handlers.clear();
        managerHandlers.clear();
        emit.mockClear();
        vi.mocked(io).mockClear();
    });

    it('uses credentialed Socket.IO and acknowledges the server-owned subscription', () => {
        const onStatus = vi.fn();
        const onDelta = vi.fn();
        const onSubscription = vi.fn();

        connectAdminActivityFeed({ onDelta, onStatus, onSubscription });

        expect(io).toHaveBeenCalledWith(
            'http://localhost:3001',
            expect.objectContaining({ withCredentials: true }),
        );

        handlers.get('connect')?.();
        expect(emit).toHaveBeenCalledWith(
            liveFeedSocketEvents.activitySubscribe,
            undefined,
            expect.any(Function),
        );

        const acknowledge = emit.mock.calls[0]?.[2] as (response: { ok: boolean }) => void;
        acknowledge({ ok: true });
        expect(onSubscription).toHaveBeenCalledWith(true);
    });
});
