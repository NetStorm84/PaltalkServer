<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Primary Meta Tags -->
    <title>@yield('title', 'h2ktalk - Free Voice & Video Chat App | No Ads, No Premium Fees')</title>
    <meta name="title" content="@yield('title', 'h2ktalk - Free Voice & Video Chat App | No Ads, No Premium Fees')">
    <meta name="description" content="@yield('description', 'Free voice and video chat app with unlimited features. No ads, no premium tiers, no virtual currencies. Create chat rooms, customize colors, and connect with friends on Windows and Mac.')">
    <meta name="keywords" content="@yield('keywords', 'free chat app, voice chat, video chat, no ads chat, chat rooms, Windows chat app, Mac chat app, unlimited chat, ad-free messaging, free video calling, community chat, paltalk alternative')">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="author" content="h2ktalk">
    <meta name="language" content="English">
    <meta name="revisit-after" content="7 days">
    
    <!-- Google Search Console Verification -->
    @if(config('services.google.search_console_verification'))
    <meta name="google-site-verification" content="{{ config('services.google.search_console_verification') }}">
    @endif
    
    <!-- Google Analytics -->
    @if(config('app.env') === 'production' && config('services.google.analytics_id'))
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ config('services.google.analytics_id') }}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{{ config('services.google.analytics_id') }}', {
            page_title: '@yield('title', 'h2ktalk - Free Voice & Video Chat App')',
            page_location: '{{ url()->current() }}',
            send_page_view: true,
            custom_map: {
                'custom_dimension_1': 'user_type'
            }
        });
        
        // Track custom events
        function trackEvent(action, category = 'engagement', label = null, value = null) {
            gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value
            });
        }
        
        // Track registration attempts
        function trackRegistration(status) {
            gtag('event', 'registration_' + status, {
                event_category: 'user_action',
                event_label: status
            });
        }
        
        // Track download attempts
        function trackDownload(platform) {
            gtag('event', 'download_attempt', {
                event_category: 'conversion',
                event_label: platform
            });
        }
    </script>
    @endif
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="@yield('og_title', 'h2ktalk - Free Voice & Video Chat App | No Ads, No Premium Fees')">
    <meta property="og:description" content="@yield('og_description', 'Free voice and video chat app with unlimited features. No ads, no premium tiers, no virtual currencies.')">
    <meta property="og:image" content="@yield('og_image', asset('og-image.png'))">
    <meta property="og:image:alt" content="h2ktalk - Free chat app screenshot">
    <meta property="og:site_name" content="h2ktalk">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{ url()->current() }}">
    <meta property="twitter:title" content="@yield('twitter_title', 'h2ktalk - Free Voice & Video Chat App | No Ads, No Premium Fees')">
    <meta property="twitter:description" content="@yield('twitter_description', 'Free voice and video chat app with unlimited features. No ads, no premium tiers, no virtual currencies.')">
    <meta property="twitter:image" content="@yield('twitter_image', asset('og-image.png'))">
    <meta property="twitter:image:alt" content="h2ktalk app interface">
    <meta name="twitter:creator" content="@h2ktalk">
    
    <!-- Additional SEO -->
    <link rel="canonical" href="{{ url()->current() }}">
    <meta name="theme-color" content="#4f46e5">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "h2ktalk",
        "description": "Free voice and video chat application with unlimited features, no ads, and no premium fees",
        "url": "{{ url('/') }}",
        "applicationCategory": "CommunicationApplication",
        "operatingSystem": ["Windows", "macOS"],
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "500",
            "bestRating": "5",
            "worstRating": "1"
        },
        "author": {
            "@type": "Organization",
            "name": "h2ktalk"
        },
        "downloadUrl": "{{ route('download') }}",
        "featureList": [
            "Unlimited voice chat",
            "HD video calling", 
            "Custom chat rooms",
            "Ad-free experience",
            "Privacy focused",
            "Cross-platform support"
        ]
    }
    </script>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Vite Assets -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
    <!-- Socket.IO for real-time admin features (proxied through Laravel) -->
    <script src="/socket.io/socket.io.js" 
            onerror="console.warn('Socket.IO library failed to load')"></script>
    
    @yield('styles')
    @stack('head')
</head>
<body class="bg-white text-gray-900 font-sans antialiased">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <a href="{{ route('home') }}" class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent hover:scale-105 transition-transform">
                    h2ktalk
                </a>
                
                <!-- Desktop Navigation -->
                <nav class="hidden md:flex items-center space-x-8">
                    <a href="{{ route('home') }}" class="text-gray-600 hover:text-gray-900 transition-colors">Home</a>
                    <a href="{{ route('download') }}" class="text-gray-600 hover:text-gray-900 transition-colors">Download</a>
                    <a href="{{ route('register') }}" class="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-full hover:from-indigo-700 hover:to-blue-700 transition-all hover:scale-105 shadow-lg">
                        Get Started
                    </a>
                </nav>
                
                <!-- Mobile menu button -->
                <button class="md:hidden p-2 text-gray-600 hover:text-gray-900">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    </header>
    
    <!-- Main Content -->
    <main>
        @yield('content')
    </main>
    
    <!-- Footer -->
    <footer class="bg-gray-50 border-t border-gray-200 py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p class="text-gray-600">© 2024 h2ktalk - Chat without compromise</p>
        </div>
    </footer>
    
    <script>
        // Set up CSRF token for all AJAX requests
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        // Helper functions
        function showError(element, message) {
            element.textContent = message;
            element.classList.remove('hidden');
            element.classList.add('block');
        }
        
        function showSuccess(element, message) {
            element.textContent = message;
            element.classList.remove('hidden');
            element.classList.add('block');
        }
        
        function hideMessage(element) {
            element.classList.add('hidden');
            element.classList.remove('block');
        }
        
        // Socket.IO connection for admin pages
        if (window.location.pathname.includes('/admin') && window.socketClient) {
            document.addEventListener('DOMContentLoaded', () => {
                window.socketClient.connect().catch(error => {
                    console.warn('Failed to connect to Socket.IO server:', error);
                });
            });
        }
        
        @yield('scripts')
    </script>
    
    @stack('scripts')
</body>
</html>