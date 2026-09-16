<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Admin - Distributed Bidding Auction Platform</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin/AdminApp.tsx'])
    </head>
    <body>
        <div id="admin-app"></div>
        <script>
            window.__ADMIN_BOOTSTRAP__ = {{ Illuminate\Support\Js::from($adminBootstrap) }};
        </script>
    </body>
</html>
