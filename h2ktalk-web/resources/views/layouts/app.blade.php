<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Primary Meta Tags -->
    <title>@yield('title', 'h2ktalk.fun - Classic Paltalk Community Chat Server | Retro 2002 Experience')</title>
    <meta name="title" content="@yield('title', 'h2ktalk.fun - Classic Paltalk Community Chat Server | Retro 2002 Experience')">
    <meta name="description" content="@yield('description', 'Experience authentic 2002 Paltalk chat rooms with the original client. Join voice chats, browse hundreds of themed rooms, and connect with a nostalgic community. Free registration, no ads.')">
    <meta name="keywords" content="paltalk, classic paltalk, retro chat, 2002 paltalk, voice chat, chat rooms, community server, nostalgia, free chat, h2ktalk">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="@yield('title', 'h2ktalk.fun - Classic Paltalk Community Chat Server')">
    <meta property="og:description" content="@yield('description', 'Experience authentic 2002 Paltalk chat rooms with the original client.')">
    <meta property="og:image" content="{{ asset('og-image.png') }}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{{ url()->current() }}">
    <meta property="twitter:title" content="@yield('title', 'h2ktalk.fun - Classic Paltalk Community Chat Server')">
    <meta property="twitter:description" content="@yield('description', 'Experience authentic 2002 Paltalk chat rooms.')">
    <meta property="twitter:image" content="{{ asset('og-image.png') }}">
    
    <!-- Additional SEO -->
    <link rel="canonical" href="{{ url()->current() }}">
    <meta name="theme-color" content="#000080">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    
    <!-- Vite Assets -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #000080;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            flex: 1;
        }
        
        header {
            padding: 2rem 0;
            text-align: center;
        }
        
        .logo {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #ffffff;
        }
        
        .tagline {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: transparent;
            border: 2px solid #ffffff;
            border-radius: 4px;
            color: #ffffff;
            text-decoration: none;
            font-weight: bold;
            font-size: 1rem;
            transition: all 0.3s ease;
            font-family: 'Courier New', monospace;
            cursor: pointer;
        }
        
        .btn:hover {
            background: #ffffff;
            color: #000080;
        }
        
        .btn-primary {
            background: #ff4500;
            color: #ffffff;
            border-color: #ff4500;
        }
        
        .btn-primary:hover {
            background: #ff6600;
            border-color: #ff6600;
            color: #ffffff;
        }
        
        .error {
            color: #ffffff;
            background: rgba(220, 38, 38, 0.2);
            border: 1px solid #dc2626;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 0.875rem;
            display: none;
        }
        
        .success {
            color: #ffffff;
            background: rgba(255, 69, 0, 0.2);
            border: 1px solid #ff4500;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 0.875rem;
            display: none;
        }
        
        footer {
            text-align: center;
            padding: 2rem 0;
            opacity: 0.8;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 3rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 15px;
            }
            
            .logo {
                font-size: 2rem;
            }
            
            .tagline {
                font-size: 1rem;
            }
            
            .btn {
                width: 100%;
                max-width: 280px;
                justify-content: center;
                padding: 0.875rem 1.5rem;
                font-size: 0.9rem;
            }
        }
        
        @yield('styles')
    </style>
    
    @stack('head')
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">🗣️ h2ktalk.fun</div>
            <div class="tagline">Community Chat Server - Relive the Classic Experience</div>
        </header>
        
        <main>
            @yield('content')
        </main>
        
        <footer>
            <p>© 2024 h2ktalk.fun Community Server - A Fan Project</p>
            <p>Not affiliated with Paltalk Communications Inc.</p>
        </footer>
    </div>
    
    <script>
        // Set up CSRF token for all AJAX requests
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        // Helper functions
        function showError(element, message) {
            element.textContent = message;
            element.style.display = 'block';
        }
        
        function showSuccess(element, message) {
            element.textContent = message;
            element.style.display = 'block';
        }
        
        function hideMessage(element) {
            element.style.display = 'none';
        }
        
        // Socket.IO connection status indicator
        function updateGlobalConnectionStatus(status) {
            // You can add a global connection indicator here if needed
            console.log('Global connection status:', status);
        }
        
        // Initialize Socket.IO if on admin pages
        if (window.location.pathname.includes('/admin') && window.socketClient) {
            document.addEventListener('DOMContentLoaded', () => {
                window.socketClient.on('connection-status', updateGlobalConnectionStatus);
                // Auto-connect for admin pages
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