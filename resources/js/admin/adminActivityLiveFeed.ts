/** Pure types and state helpers for the admin activity snapshot/live-delta flow. */
import type { LiveAdminActivityDelta } from '../types';

/** One UTC calendar-day activity bucket. */
export type ActivityPoint = {
    date: string;
    count: number;
};

/** Sanitized seven-day activity report used by the dashboard charts. */
export type ActivityReport = {
    from: string;
    to: string;
    days: number;
    bids: ActivityPoint[];
    purchases: ActivityPoint[];
};

/** Formats a UTC date-only API value without applying a local timezone shift. */
export function formatActivityDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return value;
    }

    const [, year, month, day] = match;
    return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

/** Formats an ISO timestamp as its UTC calendar date without local timezone conversion. */
export function toUtcActivityDate(value: string): string | null {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        return null;
    }

    return timestamp.toISOString().slice(0, 10);
}

/** Applies one already-deduplicated delta to the matching seven-day report bucket. */
export function applyActivityDelta(
    report: ActivityReport,
    delta: LiveAdminActivityDelta,
): ActivityReport {
    const date = toUtcActivityDate(delta.occurredAtUtc);
    if (!date || date < report.from || date > report.to) {
        return report;
    }

    const series = delta.eventType === 'BidAccepted' ? 'bids' : 'purchases';

    return {
        ...report,
        [series]: report[series].map((point) =>
            point.date === date ? { ...point, count: point.count + 1 } : point,
        ),
    };
}

/** Adds mode=fetch without disturbing any existing handoff query parameters. */
export function withFetchHandoffMode(handoffUrl: string): string {
    const url = new URL(handoffUrl, window.location.origin);
    url.searchParams.set('mode', 'fetch');

    return url.toString();
}

/** Checks the small sanitized report shape returned by Laravel. */
export function isActivityReport(value: unknown): value is ActivityReport {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const report = value as ActivityReport;
    return (
        typeof report.from === 'string' &&
        typeof report.to === 'string' &&
        report.days === 7 &&
        isActivitySeries(report.bids) &&
        isActivitySeries(report.purchases)
    );
}

function isActivitySeries(value: unknown): value is ActivityPoint[] {
    return Array.isArray(value) && value.every(isActivityPoint);
}

function isActivityPoint(value: unknown): value is ActivityPoint {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const point = value as Record<string, unknown>;
    return (
        typeof point.date === 'string' &&
        typeof point.count === 'number' &&
        Number.isInteger(point.count) &&
        point.count >= 0
    );
}
