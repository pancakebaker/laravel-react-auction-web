<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Dedicated Laravel -> Live Feed SystemAdministrator handoff settings.
    // These are intentionally separate from the Bidding Service JWT settings.
    'live_feed_admin' => [
        'url' => rtrim(env('LIVE_FEED_SERVICE_URL', 'http://localhost:3001'), '/'),
        'issuer' => env('LIVE_FEED_ADMIN_ISSUER', 'dbap-system-admin'),
        'audience' => env('LIVE_FEED_ADMIN_AUDIENCE', 'live-feed-admin'),
        'key_id' => env('LIVE_FEED_ADMIN_KEY_ID', 'system-admin-development-1'),
        'private_key_path' => env(
            'LIVE_FEED_ADMIN_PRIVATE_KEY_PATH',
            storage_path('keys/system-admin-private.pem'),
        ),
        'ttl_seconds' => (int) env('LIVE_FEED_ADMIN_TTL_SECONDS', 120),
        'timeout_seconds' => (int) env('LIVE_FEED_ADMIN_TIMEOUT_SECONDS', 10),
    ],

];
