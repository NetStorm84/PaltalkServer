@extends('layouts.admin')

@section('title', 'Admin Dashboard - h2ktalk.fun')

@section('styles')
/* Custom chart animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in-up {
    animation: fadeInUp 0.3s ease-out;
}

.stats-card {
    transition: all 0.2s ease;
}

.stats-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
@endsection

@section('content')
<!-- Dashboard Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Dashboard
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Welcome back! Here's what's happening with your server.
            </p>
        </div>
        <div class="mt-4 flex md:ml-4 md:mt-0">
            <button type="button" 
                    onclick="refreshDashboard()" 
                    class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
            </button>
        </div>
    </div>
</div>

<!-- Stats Grid -->
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
    <!-- Total Users -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0H21v-1a6 6 0 00-9-5.197"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                        <dd class="text-lg font-medium text-gray-900" id="totalUsers">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Registered accounts</div>
        </div>
    </div>

    <!-- Active Users -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Online Users</dt>
                        <dd class="text-lg font-medium text-gray-900" id="onlineUsers">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Currently connected</div>
        </div>
    </div>

    <!-- Active Rooms -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Active Rooms</dt>
                        <dd class="text-lg font-medium text-gray-900" id="activeRooms">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Rooms with users</div>
        </div>
    </div>

    <!-- Voice Sessions -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Voice Sessions</dt>
                        <dd class="text-lg font-medium text-gray-900" id="voiceSessions">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Active voice calls</div>
        </div>
    </div>

    <!-- Server Uptime -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Server Uptime</dt>
                        <dd class="text-lg font-medium text-gray-900" id="serverUptime">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Time since restart</div>
        </div>
    </div>

    <!-- Voice Sessions -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg fade-in-up">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Voice Sessions</dt>
                        <dd class="text-lg font-medium text-gray-900" id="voiceSessions">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Active voice chats</div>
        </div>
    </div>
</div>

<!-- Chat Server Status -->
<div class="bg-white shadow rounded-lg mb-8">
    <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900">Chat Server Status</h3>
            <div class="flex items-center space-x-2">
                <div id="server-status-indicator" class="w-3 h-3 rounded-full bg-gray-400"></div>
                <span id="server-status-text" class="text-sm text-gray-500">Checking...</span>
            </div>
        </div>
        
        <div id="serverStatus" class="text-gray-500 mb-4">Loading server information...</div>
        
        <!-- Info about new architecture -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-blue-800">
                        New Architecture
                    </h3>
                    <div class="mt-2 text-sm text-blue-700">
                        <p>Laravel now handles all web interface functionality directly through the chat server's internal API. The separate Node.js web interface has been removed for simplified architecture.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Real-time Rooms Management -->
<div class="bg-white shadow rounded-lg mb-8">
    <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900">Active Rooms</h3>
            <div class="flex space-x-2">
                <button onclick="refreshRooms()" class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                </button>
                <a href="{{ route('admin.rooms') }}" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    View All
                </a>
            </div>
        </div>
        
        <div id="roomsList" class="space-y-3">
            <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <p class="mt-2">Loading rooms...</p>
            </div>
        </div>
    </div>
</div>

<!-- Real-time Users Management -->
<div class="bg-white shadow rounded-lg mb-8">
    <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900">Online Users</h3>
            <div class="flex space-x-2">
                <button onclick="refreshUsers()" class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                </button>
                <a href="{{ route('admin.users') }}" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    Manage All
                </a>
            </div>
        </div>
        
        <div id="usersList" class="space-y-3">
            <div class="text-center py-8 text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0H21v-1a6 6 0 00-9-5.197"></path>
                </svg>
                <p class="mt-2">Loading users...</p>
            </div>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a href="{{ route('admin.users') }}" 
               class="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0H21v-1a6 6 0 00-9-5.197"></path>
                </svg>
                <span class="mt-2 block text-sm font-medium text-gray-900">Manage Users</span>
                <span class="mt-1 block text-xs text-gray-500">View and edit user accounts</span>
            </a>

            <a href="{{ route('admin.rooms') }}" 
               class="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <span class="mt-2 block text-sm font-medium text-gray-900">Manage Rooms</span>
                <span class="mt-1 block text-xs text-gray-500">Control chat rooms and settings</span>
            </a>

            <a href="{{ route('admin.packet-logs') }}" 
               class="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="mt-2 block text-sm font-medium text-gray-900">Packet Logs</span>
                <span class="mt-1 block text-xs text-gray-500">Monitor server communication</span>
            </a>

            <a href="{{ route('admin.bot-management') }}" 
               class="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span class="mt-2 block text-sm font-medium text-gray-900">Bot Management</span>
                <span class="mt-1 block text-xs text-gray-500">Control automated users</span>
            </a>
        </div>
    </div>
</div>
@endsection

@section('scripts')
let isSocketConnected = false;
let eventSource = null;

// Format uptime from seconds to readable format
function formatUptime(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) return 'Unknown';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// Initialize Server-Sent Events for real-time updates
function initializeRealTimeUpdates() {
    if (eventSource) {
        eventSource.close();
    }
    
    try {
        // Pass token as query parameter since SSE can't send headers
        const sseUrl = `/api/admin/dashboard/stream?token=${encodeURIComponent(adminToken)}`;
        eventSource = new EventSource(sseUrl);
        
        eventSource.onopen = function() {
            console.log('📡 Real-time connection established');
            updateConnectionStatus('connected', 'Real-time updates active');
            isSocketConnected = true;
            setupRefreshInterval();
        };
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'dashboard_update') {
                    console.log('📊 Real-time update received:', data);
                    
                    // Update server stats
                    if (data.server && data.server.stats) {
                        updateDashboardStats(data.server);
                    }
                    
                    // Update rooms if provided
                    if (data.rooms && data.rooms.rooms) {
                        displayRooms(data.rooms.rooms);
                    }
                    
                    // Update users if provided in server data
                    if (data.server && data.server.users) {
                        displayOnlineUsers(data.server.users);
                    }
                } else if (data.type === 'error') {
                    console.warn('📡 SSE Error:', data.message);
                }
            } catch (e) {
                console.error('📡 Failed to parse SSE data:', e);
            }
        };
        
        eventSource.onerror = function(event) {
            console.warn('📡 Real-time connection error, falling back to polling');
            updateConnectionStatus('disconnected', 'Using API polling');
            isSocketConnected = false;
            setupRefreshInterval();
            
            // Retry connection after 10 seconds
            setTimeout(() => {
                if (!isSocketConnected) {
                    console.log('📡 Retrying real-time connection...');
                    initializeRealTimeUpdates();
                }
            }, 10000);
        };
        
    } catch (e) {
        console.error('📡 Failed to initialize real-time updates:', e);
        updateConnectionStatus('disconnected', 'Using API polling');
        isSocketConnected = false;
        setupRefreshInterval();
    }
}

// Update dashboard stats from real-time data
function updateDashboardStats(serverData) {
    // Update database-based stats
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = serverData.database?.users_total || 0;
    
    // Update real-time server stats
    if (serverData.stats) {
        const onlineUsersEl = document.getElementById('onlineUsers');
        const activeRoomsEl = document.getElementById('activeRooms');
        const serverUptimeEl = document.getElementById('serverUptime');
        
        if (onlineUsersEl) onlineUsersEl.textContent = serverData.stats.onlineUsers || 0;
        if (activeRoomsEl) activeRoomsEl.textContent = serverData.stats.activeRooms || 0;
        if (serverUptimeEl) serverUptimeEl.textContent = formatUptime(serverData.stats.uptime || 0);
    }
    
    // Update server status display
    const statusDiv = document.getElementById('serverStatus');
    const isOnline = !serverData.error;
    
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-medium text-gray-900">Chat Server</h4>
                    <p class="mt-1 text-sm text-gray-600">Status: <span class="${isOnline ? 'text-green-600' : 'text-red-600'} font-medium">${isOnline ? 'Online' : 'Offline'}</span></p>
                    <p class="text-sm text-gray-600">Port: ${serverData.server?.port || 5001}</p>
                    <p class="text-sm text-gray-600">Version: ${serverData.server?.version || '1.0.0'}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-medium text-gray-900">Voice Server</h4>
                    <p class="mt-1 text-sm text-gray-600">Status: <span class="${serverData.voice ? 'text-green-600' : 'text-red-600'} font-medium">${serverData.voice ? 'Online' : 'Offline'}</span></p>
                    <p class="text-sm text-gray-600">Port: ${serverData.voice?.port || 2090}</p>
                    <p class="text-sm text-gray-600">Sessions: ${serverData.voice?.activeSessions || 0}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-medium text-gray-900">Database</h4>
                    <p class="mt-1 text-sm text-gray-600">Status: <span class="text-green-600 font-medium">Connected</span></p>
                    <p class="text-sm text-gray-600">Users: ${serverData.database?.users_total || 0}</p>
                    <p class="text-sm text-gray-600">Active: ${serverData.database?.users_active || 0}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-medium text-gray-900">Performance</h4>
                    <p class="mt-1 text-sm text-gray-600">CPU: ${serverData.performance?.cpu || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Memory: ${serverData.performance?.memory || 'N/A'}</p>
                    <p class="mt-2 text-sm text-gray-600">Uptime: ${serverData.stats?.uptime ? formatUptime(serverData.stats.uptime) : 'Unknown'}</p>
                </div>
            </div>
            ${serverData.error ? 
                '<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-600">⚠️ ' + serverData.error + '</p></div>' : 
                '<div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"><p class="text-sm text-green-600">✅ All systems operational • Real-time updates active</p></div>'
            }
        `;
    }
}

// Refresh dashboard data
function refreshDashboard() {
    showToast('Refreshing dashboard data...', 'warning');
    loadDashboardData();
    loadRoomsData();
    loadOnlineUsers();
}

// Update connection status indicator
function updateConnectionStatus(status, message) {
    const indicator = document.getElementById('server-status-indicator');
    const text = document.getElementById('server-status-text');
    
    if (!indicator || !text) {
        console.warn('⚠️ Connection status elements not found');
        return;
    }
    
    // Reset classes
    indicator.className = 'w-3 h-3 rounded-full';
    
    switch(status) {
        case 'connected':
            indicator.classList.add('bg-green-500');
            text.textContent = message || 'Connected';
            text.className = 'text-sm text-green-600';
            break;
        case 'disconnected':
            indicator.classList.add('bg-gray-400');
            text.textContent = message || 'Disconnected';
            text.className = 'text-sm text-gray-500';
            break;
        default:
            indicator.classList.add('bg-yellow-500');
            text.textContent = message || 'Unknown';
            text.className = 'text-sm text-yellow-600';
    }
}

// Note: Socket.IO functionality removed - Laravel uses API-only communication
function setupSocketListeners() {
    console.log('📊 Dashboard using API-only communication (Socket.IO removed)');
    isSocketConnected = false;
    updateConnectionStatus('disconnected', 'Using API polling');
}

// Request server data via API (Socket.IO removed)
function requestServerData() {
    console.log('📡 Using API-only communication for server data');
    loadDashboardData();
}

// Update dashboard from API data (Socket.IO functionality removed)
function updateDashboardFromSocket(data) {
    console.log('🔄 Note: Socket.IO functionality has been removed - using API polling instead');
    // This function is kept for compatibility but no longer used
}

// Load dashboard data
async function loadDashboardData() {
    console.log('🔄 Starting dashboard data load...');
    
    try {
        // Load real-time server state from Node.js server
        console.log('📡 Fetching server state...');
        const serverResponse = await fetch('/api/server-state', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Server response status:', serverResponse.status);
        
        if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            console.log('📊 Server data received:', serverData);
            
            // Update database-based stats
            console.log('📊 Updating database stats...');
            const totalUsersEl = document.getElementById('totalUsers');
            
            if (totalUsersEl) totalUsersEl.textContent = serverData.database?.users_total || 0;
            
            // Update real-time server stats from Node.js
            console.log('📊 Updating server stats...');
            if (serverData.stats) {
                const onlineUsersEl = document.getElementById('onlineUsers');
                const activeRoomsEl = document.getElementById('activeRooms');
                const totalConnectionsEl = document.getElementById('totalConnections');
                
                if (onlineUsersEl) onlineUsersEl.textContent = serverData.stats.onlineUsers || 0;
                if (activeRoomsEl) activeRoomsEl.textContent = serverData.stats.activeRooms || 0;
                if (totalConnectionsEl) totalConnectionsEl.textContent = serverData.stats.totalConnections || 0;
            }
            
            // Update server info (uptime is in stats, not server)
            console.log('📊 Updating server info...');
            const serverUptimeEl = document.getElementById('serverUptime');
            if (serverUptimeEl && serverData.stats && serverData.stats.uptime) {
                serverUptimeEl.textContent = formatUptime(serverData.stats.uptime);
            } else if (serverUptimeEl) {
                serverUptimeEl.textContent = 'Unknown';
            }
            
            // Update voice stats if available
            console.log('📊 Updating voice stats...');
            const voiceSessionsEl = document.getElementById('voiceSessions');
            if (voiceSessionsEl) {
                if (serverData.voice) {
                    voiceSessionsEl.textContent = serverData.voice.activeSessions || 0;
                } else {
                    voiceSessionsEl.textContent = 0;
                }
            }
            
            // Update server status display and controls
            const statusDiv = document.getElementById('serverStatus');
            const isOnline = !serverData.error;
            
            // Update server status indicator
            if (isOnline) {
                updateServerStatus('running');
            } else {
                updateServerStatus('stopped');
            }
            
            statusDiv.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-medium text-gray-900">Chat Server</h4>
                        <p class="mt-1 text-sm text-gray-600">Status: <span class="${isOnline ? 'text-green-600' : 'text-red-600'} font-medium">${isOnline ? 'Online' : 'Offline'}</span></p>
                        <p class="text-sm text-gray-600">Port: ${serverData.server?.port || 5001}</p>
                        <p class="text-sm text-gray-600">Version: ${serverData.server?.version || '1.0.0'}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-medium text-gray-900">Voice Server</h4>
                        <p class="mt-1 text-sm text-gray-600">Status: <span class="${serverData.voice ? 'text-green-600' : 'text-red-600'} font-medium">${serverData.voice ? 'Online' : 'Offline'}</span></p>
                        <p class="text-sm text-gray-600">Port: ${serverData.voice?.port || 2090}</p>
                        <p class="text-sm text-gray-600">Sessions: ${serverData.voice?.activeSessions || 0}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-medium text-gray-900">Database</h4>
                        <p class="mt-1 text-sm text-gray-600">Status: <span class="text-green-600 font-medium">Connected</span></p>
                        <p class="text-sm text-gray-600">Users: ${serverData.database?.users_total || 0}</p>
                        <p class="text-sm text-gray-600">Active: ${serverData.database?.users_active || 0}</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-medium text-gray-900">Performance</h4>
                        <p class="mt-1 text-sm text-gray-600">CPU: ${serverData.performance?.cpu || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Memory: ${serverData.performance?.memory || 'N/A'}</p>
                        <p class="mt-2 text-sm text-gray-600">Uptime: ${serverData.stats?.uptime ? formatUptime(serverData.stats.uptime) : 'Unknown'}</p>
                    </div>
                </div>
                ${serverData.error ? 
                    '<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-600">⚠️ ' + serverData.error + '</p></div>' : 
                    '<div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"><p class="text-sm text-green-600">✅ All systems operational</p></div>'
                }
            `;
        }
        
        // Also load voice server stats separately
        try {
            const voiceResponse = await fetch('/api/admin/voice/stats', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'X-CSRF-TOKEN': token
                }
            });
            
            if (voiceResponse.ok) {
                const voiceData = await voiceResponse.json();
                if (voiceData.activeSessions !== undefined) {
                    document.getElementById('voiceSessions').textContent = voiceData.activeSessions;
                }
            }
        } catch (error) {
            console.log('Voice server stats unavailable:', error.message);
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Show fallback data when server is unavailable
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('onlineUsers').textContent = '0';
        document.getElementById('activeRooms').textContent = '0';
        document.getElementById('serverUptime').textContent = 'Unknown';
        
        document.getElementById('serverStatus').innerHTML = 
            '<div class="p-4 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-600">⚠️ Unable to connect to chat server. Dashboard showing local data only.</p></div>';
        
        updateConnectionStatus('disconnected', 'Server offline');
        showToast('Failed to connect to chat server', 'error');
    }
}

// Load rooms data
async function loadRoomsData() {
    try {
        const response = await fetch('/api/admin/rooms', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRooms(data.rooms || []);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        document.getElementById('roomsList').innerHTML = 
            '<div class="text-center py-8 text-red-500"><p>Failed to load rooms: ' + error.message + '</p></div>';
    }
}

// Display rooms in the dashboard
function displayRooms(rooms) {
    const roomsList = document.getElementById('roomsList');
    
    if (rooms.length === 0) {
        roomsList.innerHTML = 
            '<div class="text-center py-8 text-gray-500"><p>No active rooms</p></div>';
        return;
    }
    
    const roomsHtml = rooms.slice(0, 5).map(room => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-2 h-2 ${room.userCount > 0 ? 'bg-green-400' : 'bg-gray-400'} rounded-full"></div>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-900">${escapeHtml(room.name || 'Unnamed Room')}</p>
                    <p class="text-sm text-gray-500">${room.userCount || 0} users • ${room.type || 'public'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${room.userCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${room.userCount > 0 ? 'Active' : 'Empty'}
                </span>
                <button onclick="manageRoom('${room.id}')" class="text-blue-600 hover:text-blue-900 text-sm">
                    Manage
                </button>
            </div>
        </div>
    `).join('');
    
    roomsList.innerHTML = roomsHtml;
    
    if (rooms.length > 5) {
        roomsList.innerHTML += `
            <div class="text-center pt-4">
                <a href="/admin/rooms" class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    View all ${rooms.length} rooms →
                </a>
            </div>
        `;
    }
}

// Load online users data
async function loadOnlineUsers() {
    try {
        const response = await fetch('/api/server-state', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayOnlineUsers(data.users || []);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading online users:', error);
        document.getElementById('usersList').innerHTML = 
            '<div class="text-center py-8 text-red-500"><p>Failed to load users: ' + error.message + '</p></div>';
    }
}

// Display online users in the dashboard
function displayOnlineUsers(users) {
    const usersList = document.getElementById('usersList');
    
    if (users.length === 0) {
        usersList.innerHTML = 
            '<div class="text-center py-8 text-gray-500"><p>No users online</p></div>';
        return;
    }
    
    const usersHtml = users.slice(0, 5).map(user => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-xs font-medium text-white">${(user.nickname || user.name || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-900">${escapeHtml(user.nickname || user.name || 'Unknown User')}</p>
                    <p class="text-sm text-gray-500">Room: ${escapeHtml(user.currentRoom || 'None')} • Admin: ${user.isAdmin ? 'Yes' : 'No'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                </span>
                <button onclick="manageUser('${user.id}')" class="text-blue-600 hover:text-blue-900 text-sm">
                    Manage
                </button>
            </div>
        </div>
    `).join('');
    
    usersList.innerHTML = usersHtml;
    
    if (users.length > 5) {
        usersList.innerHTML += `
            <div class="text-center pt-4">
                <a href="/admin/users" class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    View all ${users.length} users →
                </a>
            </div>
        `;
    }
}

// Refresh functions
function refreshRooms() {
    loadRoomsData();
    showToast('Refreshing rooms...', 'info');
}

function refreshUsers() {
    loadOnlineUsers();
    showToast('Refreshing users...', 'info');
}

// Management functions
function manageRoom(roomId) {
    window.location.href = `/admin/rooms?room=${roomId}`;
}

function manageUser(userId) {
    window.location.href = `/admin/users?user=${userId}`;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Toast notification system
function showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('dashboard-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'dashboard-toast';
        toast.className = 'fixed top-4 right-4 z-50 hidden';
        document.body.appendChild(toast);
    }
    
    // Set toast content and styling
    const typeColors = {
        'info': 'bg-blue-500',
        'success': 'bg-green-500',
        'warning': 'bg-yellow-500',
        'error': 'bg-red-500'
    };
    
    toast.innerHTML = `
        <div class="${typeColors[type] || typeColors.info} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-down">
            <span>${escapeHtml(message)}</span>
            <button onclick="hideToast()" class="ml-2 text-white hover:text-gray-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Show toast
    toast.classList.remove('hidden');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        hideToast();
    }, 4000);
}

function hideToast() {
    const toast = document.getElementById('dashboard-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
}


// Note: Server management functions removed as we no longer manage the Node.js WebInterface
// The chat server is managed independently

// Legacy server status update function (kept for compatibility)
function updateServerStatus(status) {
    // This function is kept for compatibility but server controls have been removed
    console.log('Server status update (legacy):', status);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    console.log('🔑 Admin token present:', !!adminToken);
    console.log('🎫 CSRF token present:', !!token);
    
    // Set initial connection status
    updateConnectionStatus('disconnected', 'Connecting...');
    
    // Load initial data via API
    console.log('📊 Loading initial dashboard data...');
    loadDashboardData();
    loadRoomsData();
    loadOnlineUsers();
    
    // Start real-time updates
    console.log('📡 Initializing real-time updates...');
    initializeRealTimeUpdates();
    
    // Start refresh interval (will be adjusted based on real-time connection)
    setupRefreshInterval();
});

// Refresh data periodically with dynamic interval based on connection status
let refreshInterval;

function setupRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    const interval = isSocketConnected ? 60000 : 15000; // 60s with real-time, 15s without
    
    refreshInterval = setInterval(() => {
        if (isSocketConnected) {
            // With real-time updates, just occasionally refresh rooms/users
            // The SSE handles most data updates
            console.log('📊 Light refresh (real-time active)');
        } else {
            // Without real-time, refresh all data more frequently
            console.log('📊 Full refresh (polling mode)');
            loadDashboardData();
            loadRoomsData();
            loadOnlineUsers();
        }
    }, interval);
    
    console.log(`📊 Dashboard refresh interval set to ${interval/1000}s (Real-time: ${isSocketConnected ? 'connected' : 'disconnected'})`);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});
@endsection