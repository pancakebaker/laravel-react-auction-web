# Laravel React Auction Web

[![CI](https://github.com/pancakebaker/laravel-react-auction-web/actions/workflows/validation.yml/badge.svg)](https://github.com/pancakebaker/laravel-react-auction-web/actions/workflows/validation.yml)

This repository contains the Laravel + React tenant-facing web client for the
**Distributed Bidding Auction Platform**. It is the first extracted client
repository from the original split-source monorepo.

It is built with **Laravel**, **Vite**, **React**, and **TypeScript** and provides the user-facing auction experience. The client communicates with the platform services to display auction state, place bids, and receive live auction updates.

## Quick local setup

This quick start gets the Laravel/React demo running locally using the default
development configuration.

### 1. Start the required platform services

For the full auction workflow, start the shared development infrastructure from
the [DBAP Platform Infrastructure](https://github.com/pancakebaker/docker-dbap-platform)
repository, then start the
[.NET Bidding Service](https://github.com/pancakebaker/dotnet-bidding-service).

Start the [Node.js Live Feed](https://github.com/pancakebaker/nodejs-live-feed)
as well when you want real-time auction updates and live admin activity.

With the default local setup, this application expects:

```text
Laravel/React:  http://localhost:8000
Bidding API:    http://localhost:5000
Live Feed:      http://localhost:3001
```

Use `localhost` consistently for Laravel and Live Feed. Do not mix
`127.0.0.1` and `localhost` for the credentialed Live Feed browser flow.

### 2. Create the local environment before Composer

From this repository root:

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
```

Creating `.env` first is intentional because Composer package discovery boots
Laravel during installation.

### 3. Create and seed the local SQLite database

```powershell
New-Item -ItemType File -Path database/database.sqlite -Force
php artisan migrate --seed
```

The seeders create the demo administrator, bidder accounts, CMS pages, and FAQs.

### 4. Install frontend dependencies

```powershell
npm install
```

### 5. Provision the Laravel -> Bidding signing key

For authenticated bidding and Buy Now commands, provision the local RSA key pair
with the included helper:

```powershell
.\scripts\setup-local-bidding-keys.ps1
```

Laravel keeps the private key locally at
`storage/keys/bidding-service-private.pem`; the Bidding Service receives only
the matching public key. Both are local development artifacts and private key
material must never be committed.

If the Bidding repository is not a sibling at the default path, see
[Detailed local setup](#detailed-local-setup) for the override option.

### 6. Start Laravel and Vite

In one terminal:

```powershell
php artisan serve --host=localhost --port=8000
```

In another:

```powershell
npm run dev
```

Open:

```text
http://localhost:8000
```

### 7. Sign in with a demo account

Administrator:

```text
admin@example.test
password
```

Bidder:

```text
bidder1@example.test
bidder-password
```

Additional seeded accounts and local configuration details are listed under
[Local demo accounts](#local-demo-accounts).

### Optional: enable admin Live Feed handoff

The admin dashboard's live activity channel uses a separate Laravel -> Live Feed
SystemAdministrator key pair. Follow the
[Live Feed administrator key setup](#live-feed-administrator-key-setup) section
when you want the dashboard to receive real-time activity updates.

## What the Client Does

The client is responsible for:

- Displaying available auction information and the current bid state
- Allowing users to submit bids to the bidding service
- Receiving live auction updates from the live-feed service
- Updating the UI when newer aggregate versions are received
- Preventing the browser from regressing to older auction state
- Providing the demo/live-auction experience for the platform

The client does not own auction business rules. Bid validation, concurrency control,
persistence, event publishing, and auction scheduling are handled by the backend services.

## Tech Stack

- Laravel
- React
- TypeScript
- Vite
- Vitest

## Prerequisites

Before starting the client, make sure you have:

- PHP and Composer
- Node.js and npm
- The required backend services running if you want to use the full live-auction workflow

For the complete platform experience, the bidding service and live-feed service should be available. RabbitMQ and Redis are also used by the platform's event-driven infrastructure.

## Detailed local setup

### Local/demo configuration

Create the local environment file before installing PHP dependencies:

```bash
cp .env.example .env
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env
```

This ordering is intentional. Composer's Laravel package-discovery script
boots the application during `composer install`, so `.env` must exist first.
The example file selects the local environment and keeps client-assertion
issuance disabled for local/demo use.

Install PHP dependencies:

```bash
composer install
```

Generate the Laravel application key:

```bash
php artisan key:generate
```

Create the local SQLite database file:

```bash
touch database/database.sqlite
```

On Windows PowerShell, use:

```powershell
New-Item -ItemType File -Path database/database.sqlite -Force
```

Run the migrations and seed the local/demo data:

```bash
php artisan migrate --seed
```

The seeders create the local demo administrator, bidder accounts, and CMS
pages and FAQs used by the local demo experience. To reset a local development
database, you can run:

```bash
php artisan migrate:fresh --seed
```

This deletes all existing database data, so use it only when you intentionally
want to reset a local development database.

Install JavaScript dependencies:

```bash
npm install
```

The Laravel application key above is separate from the Bidding Service token
signing key. When using Bidding-backed auction pages or authenticated commands,
provision the server-side RSA PEM configured by
`BIDDING_SERVICE_TOKEN_PRIVATE_KEY_PATH` (default:
`storage/keys/bidding-service-private.pem`) and configure the matching token
issuer, audience, key ID, and TTL values from `.env.example`. This key is not
needed merely to run Composer, boot Laravel, generate `APP_KEY`, or run local
migrations. Keep it out of browser/Vite variables and do not commit it.

For a Windows local setup with the sibling Bidding Service repository at
`D:\GitHub Projects\dotnet-bidding-service`, generate and copy the matching
key pair with:

```powershell
.\scripts\setup-local-bidding-keys.ps1
```

The script stores the private key only at
`storage/keys/bidding-service-private.pem` and copies the public key to
`src/bidding-service/keys/bidding-service-public.pem` in the Bidding Service
repository. It refuses to overwrite existing keys unless `-Force` is supplied.
This is a local-development convenience, not production key management. The
Bidding Service verifies Laravel-issued tokens with the public half; it must
never receive the Laravel private key. Restart the Bidding Service after
changing its public key. If Laravel configuration is cached, run
`php artisan config:clear` and restart Laravel as well.

If the Bidding Service repository is in another location, pass its path. These
forms are equivalent:

```powershell
.\scripts\setup-local-bidding-keys.ps1 `
    -BiddingServicePath "D:\GitHub Projects\dotnet-bidding-service2"

.\scripts\setup-local-bidding-keys.ps1 -BiddingServicePath "D:\GitHub Projects\dotnet-bidding-service2"
```

Local/demo configuration intentionally keeps
`BIDDING_SERVICE_CLIENT_ASSERTION_ENABLED=false`; local developers should not
enable client assertions just to complete setup.

The main service settings are `BIDDING_SERVICE_URL` and
`LIVE_FEED_SERVICE_URL` for server-side calls, plus
`VITE_BIDDING_API_URL` and `VITE_LIVE_FEED_URL` for browser-side reads and
Socket.IO. `TENANT_ID` identifies the tenant represented by this Laravel
installation. Keep signing key paths server-side and do not expose credentials
through Vite variables.

Use `http://localhost:8000` consistently when running this client with Live
Feed at `http://localhost:3001`. Mixing `127.0.0.1` and `localhost` changes
the browser origin and host-only cookie context and can prevent the
credentialed Live Feed handoff or Socket.IO session from working.

### Live Feed administrator key setup

Laravel admin access to the Live Feed service uses a separate short-lived
SystemAdministrator assertion. Configure `LIVE_FEED_ADMIN_ISSUER`,
`LIVE_FEED_ADMIN_AUDIENCE`, `LIVE_FEED_ADMIN_KEY_ID`,
`LIVE_FEED_ADMIN_PRIVATE_KEY_PATH`, the short `LIVE_FEED_ADMIN_TTL_SECONDS`,
and `LIVE_FEED_ADMIN_TIMEOUT_SECONDS` values from `.env.example`; these
settings are deliberately separate from the Bidding Service JWT issuer. The
private key is kept only by Laravel at
`storage/keys/system-admin-private.pem`. The matching public key must be
provisioned in the Live Feed repository at its configured
`config/system-admin-public.pem` path (or its equivalent `kid=path` registry).
Never copy or commit the Laravel private key.

An authenticated Laravel administrator establishes the Node-owned
`live_feed_admin` HttpOnly session through `POST /admin/live-feed/session`.
Laravel performs the token exchange server-side and returns only a safe browser
handoff URL; Node issues the cookie. After the handoff succeeds, the dashboard
connects to Socket.IO with credentials, subscribes to the authorized admin
activity channel, applies live deltas, and re-fetches the authoritative activity
snapshot after reconnect. Production deployments must provision the matching
public and private key material through their secret/key-management process
rather than relying on local development values.

The dedicated assertion uses `RS256`, issuer `dbap-system-admin`, audience
`live-feed-admin`, key ID `system-admin-development-1`, role
`SystemAdministrator`, permission `livefeed.admin`, a trusted `tenant_id`
when applicable, and a 120-second TTL. These claims are not the Bidding
Service token claims and must not be configured through the Bidding Service
issuer settings.

For local Live Feed access, generate the dedicated 3072-bit RSA private key
only if it does not already exist, then derive the public half for Node:

```powershell
$laravelKeyDir = "storage/keys"
$laravelPrivate = "$laravelKeyDir/system-admin-private.pem"
$nodePublic = "..\nodejs-live-feed\config\system-admin-public.pem"
New-Item -ItemType Directory -Path $laravelKeyDir -Force | Out-Null
if (-not (Test-Path $laravelPrivate)) {
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out $laravelPrivate
}
New-Item -ItemType Directory -Path (Split-Path -Parent $nodePublic) -Force | Out-Null
openssl pkey -in $laravelPrivate -pubout -out $nodePublic
```

The private file is ignored under `storage/keys/`; keep it Laravel-side only.
Node must be restarted after its public key changes. The browser uses the
returned handoff URL with `mode=fetch` and credentials so Node can set its
HttpOnly cookie; no iframe, JWT, or cookie value is exposed to React.

The admin dashboard's activity charts use the Bidding Service
`GET /api/reporting/activity?days=7` snapshot and then consume the authorized
Live Feed `admin:activity:delta` stream. `BidAccepted` increments Bids and
`AuctionPurchased` increments Purchases. Purchases include explicit Buy Now
and threshold-triggered purchase completions. Both use UTC calendar-day
buckets, event IDs are deduplicated in memory, and reconnects re-fetch the
authoritative snapshot through `GET /admin/activity-report`. The dashboard
remains usable with snapshot data if Live Feed is unavailable.

The reporting refresh route is authenticated and admin-only:
`GET /admin/activity-report`. It returns the same sanitized seven-day report
and responds with `503 Activity data unavailable.` when the Bidding Service
cannot be reached. The browser never calls the Bidding Service directly.

Bidder IDs from the Bidding Service remain opaque. Laravel's presentation
layer resolves public bidder labels from local identity data in this order:
display name, a masked email when available, then a shortened bidder ID. Full
email addresses and bidder profile data are not added to Bidding contracts or
Live Feed events.

Each deployment represents one configured tenant. Separate customer domains
can run separate Laravel installations with different server-side `TENANT_ID`
values; tenant authority is not selected from arbitrary browser input.

### Production configuration

Before serving production traffic, enable the existing server-side Bidding
Service client-assertion configuration:

```ini
BIDDING_SERVICE_CLIENT_ASSERTION_ENABLED=true
BIDDING_SERVICE_CLIENT_ID=...
BIDDING_SERVICE_CLIENT_KEY_ID=...
BIDDING_SERVICE_CLIENT_PRIVATE_KEY_PATH=...
```

Provision the referenced RSA private key through the deployment secret/key
management process. Do not commit private keys or expose them through Vite
variables. `ClientAssertionProductionPolicy` remains enforced; the local
defaults above are not production settings.

## Running the client

Start Laravel:

```bash
php artisan serve
```

In another terminal, start the Vite development server:

```bash
npm run dev
```

Then open the local Laravel URL shown by `php artisan serve`, typically:

```text
http://localhost:8000
```

## Production Build

Build the frontend assets with:

```bash
npm run build
```

## Tests and Quality Checks

Run the client test suite with:

```bash
npm test
php artisan test
composer test
```

Run TypeScript validation with:

```bash
npm run typecheck
```

Run ESLint with:

```bash
npm run lint
```

Check formatting with:

```bash
npm run format:check
```

Check PHP formatting with:

```bash
vendor/bin/pint --test
```

## Static Analysis

The standalone client owns its JavaScript/TypeScript quality gates.

The project uses:

- ESLint
- TypeScript-aware linting
- React and React Hooks rules
- JSX accessibility checks
- Prettier
- JSDoc documentation enforcement for the public/exported source surface

These checks should run in this repository's CI.

## Related Services

The client is part of a larger distributed auction platform that includes:

- **Bidding Service** — validates and accepts bids and owns bid state transitions
- **Live Feed Service** — consumes auction events and broadcasts live updates to connected clients
- **Auction Operations Portal** — separate operations UI and service boundary
- **Auction Scheduler** — Bidding-repository worker that closes eligible expired auctions
- **Outbox Publisher** — Bidding-repository worker that publishes durable outbox events

Laravel owns bidder and tenant-admin identity for the tenant configured by the server-side `TENANT_ID` value. Authenticated bid, Buy Now, and tenant auction-management commands use same-origin Laravel routes, which mint short-lived RS256 Bidding Service tokens server-side and proxy the commands. Those tokens carry the authenticated user's trusted `tenant_id`; the browser never chooses or stores tenant authority or downstream tokens. Public auction reads and Socket.IO events remain anonymous. Authoritative auction state, bid validation, concurrency, persistence, and event publishing remain owned by the Bidding Service. Real-time updates are received from the external Live Feed service.

### Authenticated auction commands

Signed-in users can bid or use Buy Now through the Laravel session and CSRF-protected BFF. The Bidding Service validates the Laravel-issued token and derives `BidderId`/`FinalWinnerId` from the token `sub`; Buy Now is a `POST /api/auctions/{auction}/buy-now` request with the compatibility JSON object `{"bidderId":null}`. That field is ignored for identity; the authenticated JWT remains authoritative. Seeded local bidder accounts are provisioned for development, and public signup is intentionally unavailable. The HTTP auction read API remains the recovery authority after stale or missed live updates.

## Local demo accounts

The shared `/login` page is used by both bidders and administrators. These
accounts are provisioned by `php artisan migrate --seed` in local/testing
environments.

### Administrators

The built-in demo administrator uses the following values when the related
environment variables are unset:

- Email: `admin@example.test`
- Password: `password`
- Environment variables: `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`

The `.env.example` also enables a separately configured local administrator:

- Email: `local-admin@example.test`
- Password: `local-admin-password`
- Environment variables: `LOCAL_ADMIN_EMAIL`, `LOCAL_ADMIN_PASSWORD`

### Bidders

Local development seeders provision these non-admin bidder accounts:

- `bidder1@example.test`
- `bidder2@example.test`
- `bidder3@example.test`

`LocalBidderSeeder` reads `DEMO_BIDDER_PASSWORD`; when it is unset, the
fallback is `bidder-password`.

These credentials are strictly for local/demo development. Production
deployments must not rely on them. Public signup remains unavailable. Bidder
login returns to a safe intended auction page when available, otherwise it
falls back to `/auctions`; administrator login falls back to `/admin`.

`TENANT_ID` identifies the one tenant represented by this Laravel installation.
It is a server-side UUID, not a user ID, password, client credential, or
SystemAdministrator identity. Local/testing environments use the deterministic
demo tenant when it is omitted; non-local environments must configure a valid
UUID explicitly. MT2 carries this identity in Laravel-issued Bidding Service
tokens. Public reads now use a server-side tenant-bound read token, and event
payloads/Live Feed projections carry tenant identity. Bidding Service command
authorization and tenant status enforcement remain explicit policy boundaries;
ClientApplication admission and external OIDC remain deferred.

## Related repositories

- [Bidding Service](https://github.com/pancakebaker/dotnet-bidding-service) owns authoritative auction, bid, tenant, and Buy Now decisions.
- [Live Feed](https://github.com/pancakebaker/nodejs-live-feed) projects integration events to Socket.IO clients.
- [Operations Portal](https://github.com/pancakebaker/dotnet-blazor-operations-portal) provides the global operations control plane.
- [DBAP Platform Infrastructure](https://github.com/pancakebaker/docker-dbap-platform) provides development PostgreSQL, RabbitMQ, and Redis.
- [Historical integrated monorepo](https://github.com/pancakebaker/distributed-bidding-auction-platform) preserves the original platform snapshot.

## Status and licensing

This is a functioning architecture and portfolio/demo client, not a complete
production-hardening package. No license file is currently included in this
extracted repository; licensing should be made explicit before redistribution.
