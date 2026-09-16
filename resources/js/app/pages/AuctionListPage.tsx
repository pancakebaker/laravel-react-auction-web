/**
 * Displays the public auction discovery page.
 */
import type { AuctionSummary } from '../../types';
import { StateMessage } from '../components/PublicComponents';
import { useNow } from '../hooks/useNow';
import { formatDate, formatMoney, getCountdown, statusTone } from '../utils/auction';
import { navigateTo } from '../utils/navigation';
/**
 * Renders auction discovery data from the authoritative API.
 */
export function AuctionListPage({
    auctions,
    error,
    loading,
    onRetry,
}: {
    auctions: AuctionSummary[];
    error: string | null;
    loading: boolean;
    onRetry: () => Promise<void>;
}) {
    const now = useNow();

    return (
        <>
            <section className="page-heading">
                <p className="eyebrow">Auction discovery</p>
                <h1>Live bidding demo</h1>
                <p>
                    Browse seeded auctions, place bids through the authoritative .NET API, and watch
                    accepted bids fan out in real time.
                </p>
            </section>

            {loading && (
                <StateMessage
                    title="Loading auctions"
                    message="Fetching current auction state from the Bidding API."
                />
            )}
            {error && (
                <section
                    aria-labelledby="auction-service-unavailable-title"
                    className="state-message state-unavailable"
                    role="alert"
                >
                    <div className="state-message-copy">
                        <p className="eyebrow">Service status</p>
                        <h2 id="auction-service-unavailable-title">Bidding API unavailable</h2>
                        <p>
                            The auction client is running, but it cannot currently reach the Bidding
                            Service.
                        </p>
                    </div>
                    <div className="state-message-details">
                        <div>
                            <strong>Possible causes</strong>
                            <ul>
                                <li>The Bidding Service is not running.</li>
                                <li>The configured service URL is incorrect.</li>
                                <li>Required server-side signing configuration is unavailable.</li>
                                <li>The service may still be starting.</li>
                            </ul>
                        </div>
                        <div>
                            <strong>Next steps</strong>
                            <ul>
                                <li>Start or check the Bidding Service.</li>
                                <li>Verify the local service configuration.</li>
                                <li>Retry after the backend becomes available.</li>
                            </ul>
                        </div>
                    </div>
                    <p className="state-message-technical">
                        <span>Technical detail:</span> {error}
                    </p>
                    <button className="primary-button" onClick={() => void onRetry()} type="button">
                        Retry
                    </button>
                </section>
            )}

            <section className="auction-grid" aria-label="Auction list">
                {auctions.map((auction) => (
                    <article className="auction-card" key={auction.id}>
                        <div className="card-row">
                            <span className={`status-pill ${statusTone(auction.status)}`}>
                                {auction.status}
                            </span>
                            <span className="countdown">{getCountdown(auction, now)}</span>
                        </div>
                        <h2>{auction.title}</h2>
                        <dl className="metric-list">
                            <div>
                                <dt>Current bid</dt>
                                <dd>
                                    {auction.currentBidAmount === null
                                        ? auction.saleMode === 'BuyNowOnly'
                                            ? 'Buy Now only'
                                            : formatMoney(auction.startingPrice)
                                        : formatMoney(auction.currentBidAmount)}
                                </dd>
                            </div>
                            <div>
                                <dt>Sale mode</dt>
                                <dd>{auction.saleMode}</dd>
                            </div>
                            {auction.buyNowPrice !== null && (
                                <div>
                                    <dt>Buy Now</dt>
                                    <dd>{formatMoney(auction.buyNowPrice)}</dd>
                                </div>
                            )}
                            <div>
                                <dt>Minimum increment</dt>
                                <dd>{formatMoney(auction.minimumBidIncrement)}</dd>
                            </div>
                            <div>
                                <dt>Window</dt>
                                <dd>
                                    {formatDate(auction.startTimeUtc)} -{' '}
                                    {formatDate(auction.endTimeUtc)}
                                </dd>
                            </div>
                        </dl>
                        <button
                            className="primary-button"
                            onClick={() => navigateTo(`/auctions/${auction.id}`)}
                            type="button"
                        >
                            View auction
                        </button>
                    </article>
                ))}
            </section>
        </>
    );
}
