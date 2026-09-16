<nav class="public-navigation" aria-label="Public navigation" data-public-navigation>
    <div class="public-navigation-inner">
        <a class="public-navigation-brand" href="{{ route('auctions.index') }}">
            Distributed Bidding Auction Platform
        </a>
        <button
            class="public-navigation-toggle"
            type="button"
            aria-controls="public-navigation-menu"
            aria-expanded="false"
            aria-label="Toggle navigation"
            data-public-navigation-toggle
        >
            <span class="public-navigation-toggle-icon" aria-hidden="true">☰</span>
            <span>Menu</span>
        </button>
        <div class="public-navigation-links" id="public-navigation-menu" data-public-navigation-menu>
            <a href="{{ route('auctions.index') }}">Auctions</a>
            @foreach ($publicNavigationPages as $page)
                <a
                    href="{{ route('cms.pages.show', ['page' => $page['slug']]) }}"
                >{{ $page['title'] }}</a>
            @endforeach
            @auth
                <span class="public-navigation-user" aria-label="Signed-in user">{{ auth()->user()->name }}</span>
                <form class="public-navigation-logout" method="post" action="{{ route('logout') }}">
                    @csrf
                    <button class="public-navigation-link-button" type="submit">Log out</button>
                </form>
            @else
                <a href="{{ route('login') }}">Sign in</a>
            @endauth
        </div>
    </div>
</nav>
<script>
    (() => {
        const navigation = document.querySelector('[data-public-navigation]');
        const toggle = navigation?.querySelector('[data-public-navigation-toggle]');
        const menu = navigation?.querySelector('[data-public-navigation-menu]');

        if (!toggle || !menu) {
            return;
        }

        const setExpanded = (expanded) => {
            toggle.setAttribute('aria-expanded', String(expanded));
            menu.classList.toggle('is-open', expanded);
        };

        toggle.addEventListener('click', () => {
            setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
        });

        navigation.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                setExpanded(false);
                toggle.focus();
            }
        });

        menu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => setExpanded(false));
        });
    })();
</script>
