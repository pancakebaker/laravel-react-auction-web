/** React lifecycle integration for authenticated tenant-wide admin activity deltas. */
import { useEffect, useRef, useState } from 'react';
import { connectAdminActivityFeed } from '../liveFeed';
import type { LiveAdminActivityDelta } from '../types';
import { liveFeedSocketEvents } from '../contracts/liveFeedTransport';
import {
    applyActivityDelta,
    isActivityReport,
    type ActivityReport,
    withFetchHandoffMode,
} from './adminActivityLiveFeed';

/** Connection status shown beside the activity charts. */
export type AdminActivityLiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

let handoffPromise: Promise<void> | null = null;

async function establishAdminSession(): Promise<void> {
    const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    const sessionResponse = await fetch('/admin/live-feed/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
    });
    if (!sessionResponse.ok) {
        throw new Error('Live Feed session bootstrap failed.');
    }

    const session = (await sessionResponse.json()) as { handoffUrl?: unknown };
    if (typeof session.handoffUrl !== 'string' || session.handoffUrl === '') {
        throw new Error('Live Feed session bootstrap returned no handoff URL.');
    }

    const handoffResponse = await fetch(withFetchHandoffMode(session.handoffUrl), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (handoffResponse.status !== 204) {
        throw new Error('Live Feed handoff failed.');
    }
}

function getAdminSession(): Promise<void> {
    handoffPromise ??= establishAdminSession().catch((error: unknown) => {
        handoffPromise = null;
        throw error;
    });

    return handoffPromise;
}

/**
 * Keeps the reporting snapshot authoritative while applying deduplicated live deltas.
 * Deltas received during reconciliation are queued and reapplied after the fresh snapshot.
 */
export function useAdminActivityLiveUpdates(initialReport: ActivityReport | null) {
    const [report, setReport] = useState<ActivityReport | null>(initialReport);
    const [status, setStatus] = useState<AdminActivityLiveStatus>('offline');
    const activeRef = useRef(true);
    const reconnectingRef = useRef(false);
    const queuedRef = useRef<LiveAdminActivityDelta[]>([]);
    const eventIdsRef = useRef(new Set<string>());
    const eventOrderRef = useRef<string[]>([]);

    useEffect(() => {
        setReport(initialReport);
    }, [initialReport]);

    useEffect(() => {
        activeRef.current = true;
        if (!initialReport) {
            return () => {
                activeRef.current = false;
            };
        }

        let cancelled = false;
        let hasConnected = false;
        setStatus('connecting');

        const applyDelta = (delta: LiveAdminActivityDelta) => {
            if (!eventIdsRef.current.has(delta.eventId)) {
                eventIdsRef.current.add(delta.eventId);
                eventOrderRef.current.push(delta.eventId);
                if (eventOrderRef.current.length > 1000) {
                    const oldest = eventOrderRef.current.shift();
                    if (oldest) eventIdsRef.current.delete(oldest);
                }
            } else {
                return;
            }

            if (reconnectingRef.current) {
                queuedRef.current.push(delta);
                return;
            }

            setReport((current) => {
                if (!current) return current;
                return applyActivityDelta(current, delta);
            });
        };

        const reconcile = async () => {
            reconnectingRef.current = true;
            try {
                const response = await fetch('/admin/activity-report', {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (!response.ok) throw new Error('Activity report refresh failed.');
                const next = (await response.json()) as unknown;
                if (!isActivityReport(next) || !activeRef.current)
                    throw new Error('Invalid activity report.');
                const queued = queuedRef.current.splice(0);
                const rebased = queued.reduce(applyActivityDelta, next);
                setReport(rebased);
            } catch {
                const queued = queuedRef.current.splice(0);
                if (activeRef.current && queued.length > 0) {
                    setReport((current) => {
                        if (!current) return current;
                        const retained = queued.reduce(applyActivityDelta, current);
                        return retained;
                    });
                }
            } finally {
                reconnectingRef.current = false;
            }
        };

        let socket: ReturnType<typeof connectAdminActivityFeed> | null = null;
        void getAdminSession()
            .then(() => {
                if (cancelled) return;
                socket = connectAdminActivityFeed({
                    onDelta: applyDelta,
                    onStatus: (connectionStatus) => {
                        if (cancelled) return;
                        if (connectionStatus === 'connected') {
                            setStatus('connecting');
                            if (hasConnected) void reconcile();
                            hasConnected = true;
                        } else if (connectionStatus === 'reconnecting') {
                            setStatus('reconnecting');
                        } else {
                            setStatus('offline');
                        }
                    },
                    onSubscription: (accepted) => {
                        if (!cancelled) setStatus(accepted ? 'live' : 'offline');
                    },
                });
            })
            .catch(() => {
                if (!cancelled) setStatus('offline');
            });

        return () => {
            cancelled = true;
            activeRef.current = false;
            reconnectingRef.current = false;
            queuedRef.current = [];
            if (socket) {
                socket.emit(liveFeedSocketEvents.activityUnsubscribe);
                socket.disconnect();
            }
        };
    }, [initialReport]);

    return { report, status };
}
