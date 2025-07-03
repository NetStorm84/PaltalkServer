<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <title>@yield('title', 'Admin Dashboard - h2ktalk.fun')</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    
    <!-- Tailwind CSS via CDN for rapid prototyping -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Socket.IO (load from Node.js server directly) -->
    <script>
        // Load Socket.IO from the Node.js server for real-time features
        (function() {
            const socketUrl = '{{ env("CHAT_SERVER_SOCKET_URL", "http://localhost:3000") }}';
            
            fetch(socketUrl + '/socket.io/socket.io.js', { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        const script = document.createElement('script');
                        script.src = socketUrl + '/socket.io/socket.io.js';
                        script.async = true;
                        script.onload = function() {
                            console.log('✅ Socket.IO loaded from:', socketUrl);
                            // Store the socket URL for dashboard connections
                            window.CHAT_SERVER_URL = socketUrl;
                        };
                        script.onerror = function() {
                            console.warn('❌ Socket.IO failed to load from:', socketUrl);
                            window.io = undefined;
                        };
                        document.head.appendChild(script);
                    } else {
                        console.warn('⚠️ Socket.IO not available at:', socketUrl);
                        window.io = undefined;
                    }
                })
                .catch((error) => {
                    console.warn('⚠️ Cannot reach Socket.IO server at:', socketUrl, error.message);
                    window.io = undefined;
                });
        })();
    </script>
    
    <style>
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        
        /* Animation classes */
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-down {
            animation: slideDown 0.2s ease-out;
        }
        
        /* Custom focus styles */
        .focus-ring:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
        }
        
        @yield('styles')
    </style>
</head>
<body class="h-full bg-gray-50">
    <div class="min-h-full">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <!-- Logo -->
                        <div class="flex-shrink-0 flex items-center">
                            <div class="text-2xl font-bold text-gray-900">
                                🗣️ <span class="text-blue-600">h2ktalk</span><span class="text-gray-400">.fun</span>
                            </div>
                        </div>
                        
                        <!-- Navigation Links -->
                        <div class="hidden sm:ml-8 sm:flex sm:space-x-8">
                            <a href="{{ route('admin.dashboard') }}" 
                               class="inline-flex items-center px-1 pt-1 text-sm font-medium {{ request()->routeIs('admin.dashboard') ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                Dashboard
                            </a>
                            <a href="{{ route('admin.users') }}" 
                               class="inline-flex items-center px-1 pt-1 text-sm font-medium {{ request()->routeIs('admin.users*') ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0H21v-1a6 6 0 00-9-5.197"></path>
                                </svg>
                                Users
                            </a>
                            <a href="{{ route('admin.rooms') }}" 
                               class="inline-flex items-center px-1 pt-1 text-sm font-medium {{ request()->routeIs('admin.rooms*') ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                                Rooms
                            </a>
                            <a href="{{ route('admin.packet-logs') }}" 
                               class="inline-flex items-center px-1 pt-1 text-sm font-medium {{ request()->routeIs('admin.packet-logs') ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Logs
                            </a>
                            <a href="{{ route('admin.bot-management') }}" 
                               class="inline-flex items-center px-1 pt-1 text-sm font-medium {{ request()->routeIs('admin.bot-management') ? 'border-b-2 border-blue-500 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                Bots
                            </a>
                        </div>
                    </div>
                    
                    <!-- Right side -->
                    <div class="flex items-center space-x-4">
                        <!-- Connection Status -->
                        <div id="connection-status" class="hidden sm:flex items-center">
                            <div class="flex items-center text-sm text-gray-500">
                                <div id="status-indicator" class="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                <span id="status-text">Connecting...</span>
                            </div>
                        </div>
                        
                        <!-- User Menu -->
                        <div class="relative">
                            <button type="button" 
                                    class="flex items-center text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2"
                                    onclick="toggleUserMenu()">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                Admin
                                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            
                            <!-- Dropdown menu -->
                            <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                <a href="{{ route('home') }}" 
                                   class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                    Back to Site
                                </a>
                                <button onclick="logout()" 
                                        class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Page Content -->
        <main class="py-6">
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                @yield('content')
            </div>
        </main>
    </div>
    
    <!-- Success/Error Toast -->
    <div id="toast" class="hidden fixed top-4 right-4 z-50 max-w-sm w-full">
        <div id="toast-content" class="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg id="toast-icon" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <div class="ml-3">
                    <p id="toast-message" class="text-sm font-medium text-gray-900"></p>
                </div>
                <div class="ml-auto pl-3">
                    <button onclick="hideToast()" class="text-gray-400 hover:text-gray-600">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Set up CSRF token for all AJAX requests
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        let adminToken = localStorage.getItem('admin_token');
        
        // Check if user is logged in
        if (!adminToken) {
            console.warn('⚠️ No admin token found, creating temporary token for development');
            adminToken = 'admin-dev-token';
            localStorage.setItem('admin_token', adminToken);
        }
        
        // Make token available globally
        window.adminToken = adminToken;
        
        // User menu toggle
        function toggleUserMenu() {
            const menu = document.getElementById('user-menu');
            menu.classList.toggle('hidden');
        }
        
        // Close user menu when clicking outside
        document.addEventListener('click', function(event) {
            const menu = document.getElementById('user-menu');
            const button = event.target.closest('[onclick="toggleUserMenu()"]');
            
            if (!button && !menu.contains(event.target)) {
                menu.classList.add('hidden');
            }
        });
        
        // Toast notifications
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const content = document.getElementById('toast-content');
            const icon = document.getElementById('toast-icon');
            const messageEl = document.getElementById('toast-message');
            
            messageEl.textContent = message;
            
            // Update styling based on type
            if (type === 'success') {
                content.className = 'bg-white border border-green-200 rounded-lg shadow-lg p-4';
                icon.className = 'h-5 w-5 text-green-500';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
            } else if (type === 'error') {
                content.className = 'bg-white border border-red-200 rounded-lg shadow-lg p-4';
                icon.className = 'h-5 w-5 text-red-500';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
            } else if (type === 'warning') {
                content.className = 'bg-white border border-yellow-200 rounded-lg shadow-lg p-4';
                icon.className = 'h-5 w-5 text-yellow-500';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>';
            }
            
            toast.classList.remove('hidden');
            toast.classList.add('animate-slide-down');
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
                hideToast();
            }, 4000);
        }
        
        function hideToast() {
            const toast = document.getElementById('toast');
            toast.classList.add('hidden');
            toast.classList.remove('animate-slide-down');
        }
        
        // Connection status
        function updateConnectionStatus(status, text) {
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            if (indicator && statusText) {
                if (status === 'connected') {
                    indicator.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
                    statusText.textContent = text || 'Connected';
                } else if (status === 'connecting') {
                    indicator.className = 'w-2 h-2 bg-yellow-500 rounded-full mr-2';
                    statusText.textContent = text || 'Connecting...';
                } else {
                    indicator.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
                    statusText.textContent = text || 'Disconnected';
                }
            }
        }
        
        // Logout function
        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        }
        
        // Initialize connection status
        updateConnectionStatus('connecting');
        
        // Set up global error handler for scripts
        window.addEventListener('error', function(e) {
            if (e.target.tagName === 'SCRIPT') {
                console.warn('Script failed to load:', e.target.src);
            }
        });
        
        @yield('scripts')
    </script>
    
    @stack('scripts')
</body>
</html>