/**
 * Routes the public auction experience between discovery and auction detail pages.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuctions } from '../api';
import type { AuctionSummary } from '../types';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { AuctionListPage } from './pages/AuctionListPage';
import { Shell } from './components/PublicComponents';
import { usePath } from './hooks/usePath';

/**
 * Routes between auction discovery and auction detail without replacing Laravel routing.
 */
export function AuctionApp() {
    const path = usePath();
    const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const listRequest = useRef<Promise<void> | null>(null);
    const hasLoadedList = useRef(false);
    const auctionMatch = path.match(/^\/auctions\/([^/]+)$/);
    const isListRoute = !auctionMatch;

    const loadAuctions = useCallback(() => {
        if (listRequest.current) {
            return listRequest.current;
        }

        setListLoading(true);
        setListError(null);

        const request = getAuctions()
            .then((items) => {
                setAuctions(items);
                hasLoadedList.current = true;
            })
            .catch((caught) =>
                setListError(caught instanceof Error ? caught.message : 'Unable to load auctions.'),
            )
            .finally(() => setListLoading(false));

        listRequest.current = request;
        void request.finally(() => {
            if (listRequest.current === request) {
                listRequest.current = null;
            }
        });

        return request;
    }, []);

    useEffect(() => {
        if (isListRoute && !hasLoadedList.current) {
            void loadAuctions();
        }
    }, [isListRoute, loadAuctions]);

    if (auctionMatch) {
        return (
            <Shell>
                <AuctionDetailPage auctionId={auctionMatch[1]} />
            </Shell>
        );
    }

    return (
        <Shell>
            <AuctionListPage
                auctions={auctions}
                error={listError}
                loading={listLoading}
                onRetry={loadAuctions}
            />
        </Shell>
    );
}
