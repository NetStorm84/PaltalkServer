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
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
</div>

<!-- Server Status & Controls -->
<div class="bg-white shadow rounded-lg mb-8">
    <div class="px-4 py-5 sm:p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900">Server Status & Controls</h3>
            <div class="flex items-center space-x-2">
                <div id="server-status-indicator" class="w-3 h-3 rounded-full bg-gray-400"></div>
                <span id="server-status-text" class="text-sm text-gray-500">Checking...</span>
            </div>
        </div>
        
        <div id="serverStatus" class="text-gray-500 mb-4">Loading server information...</div>
        
        <!-- Server Controls -->
        <div class="flex space-x-3">
            <button id="start-server-btn" 
                    onclick="startServer()" 
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                </svg>
                Start Server
            </button>
            
            <button id="stop-server-btn" 
                    onclick="stopServer()" 
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"></path>
                </svg>
                Stop Server
            </button>
            
            <button id="restart-server-btn" 
                    onclick="restartServer()" 
                    class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Restart Server
            </button>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

// Refresh dashboard data
function refreshDashboard() {
    showToast('Refreshing dashboard data...', 'warning');
    loadDashboardData();
}

// Socket.IO event handlers for dashboard
function setupSocketListeners() {
    console.log('🔌 Setting up Socket.IO listeners...');
    
    if (typeof io === 'undefined' || !io) {
        console.warn('⚠️ Socket.IO library not available - using API fallback only');
        updateConnectionStatus('disconnected', 'Real-time disabled');
        return;
    }
    
    try {
        // Try to connect to Node.js server for real-time updates
        const chatServerUrl = 'http://localhost:3000';
        window.dashboardSocket = io(chatServerUrl);
        
        window.dashboardSocket.on('connect', () => {
            console.log('✅ Dashboard connected to chat server');
            isSocketConnected = true;
            updateConnectionStatus('connected', 'Chat server online');
            requestServerData();
        });
        
        window.dashboardSocket.on('disconnect', () => {
            console.log('❌ Dashboard disconnected from chat server');
            isSocketConnected = false;
            updateConnectionStatus('disconnected', 'Chat server offline');
        });
        
        // Listen for server state updates
        window.dashboardSocket.on('server-state-update', (data) => {
            console.log('📊 Real-time server state update:', data);
            updateDashboardFromSocket(data);
        });
        
        // Error handling
        window.dashboardSocket.on('connect_error', (error) => {
            console.warn('❌ Dashboard Socket.IO connection error:', error.message);
            isSocketConnected = false;
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize Socket.IO for dashboard:', error);
        isSocketConnected = false;
    }
}

// Request server data via Socket.IO
function requestServerData() {
    if (window.dashboardSocket && isSocketConnected) {
        window.dashboardSocket.emit('requestServerState', {});
        console.log('📡 Requested real-time server state via Socket.IO');
    }
}

// Update dashboard from Socket.IO data
function updateDashboardFromSocket(data) {
    console.log('🔄 Updating dashboard with Socket.IO data:', data);
    
    if (data.database) {
        document.getElementById('totalUsers').textContent = data.database.users_total || 0;
        document.getElementById('activeUsers').textContent = data.database.users_active || 0;
        document.getElementById('adminUsers').textContent = data.database.admins || 0;
    }
    
    if (data.stats) {
        document.getElementById('onlineUsers').textContent = data.stats.onlineUsers || 0;
        document.getElementById('activeRooms').textContent = data.stats.activeRooms || 0;
        document.getElementById('totalConnections').textContent = data.stats.totalConnections || 0;
    }
    
    if (data.stats && data.stats.uptime !== undefined) {
        document.getElementById('serverUptime').textContent = formatUptime(data.stats.uptime);
    } else {
        document.getElementById('serverUptime').textContent = 'Unknown';
    }
    
    if (data.voice) {
        document.getElementById('voiceSessions').textContent = data.voice.activeSessions || 0;
    } else {
        document.getElementById('voiceSessions').textContent = 0;
    }
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
                        <p class="text-sm text-gray-600">Uptime: ${serverData.stats?.uptime ? formatUptime(serverData.stats.uptime) : 'Unknown'}</p>
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


// Server control functions
async function startServer() {
    const btn = document.getElementById('start-server-btn');
    btn.disabled = true;
    btn.textContent = 'Starting...';
    
    try {
        const response = await fetch('/api/admin/server/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Server started successfully', 'success');
            updateServerStatus('running');
            setTimeout(loadDashboardData, 2000); // Refresh data after 2 seconds
        } else {
            showToast('Failed to start server: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Error starting server: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Start Server';
    }
}

async function stopServer() {
    const btn = document.getElementById('stop-server-btn');
    btn.disabled = true;
    btn.textContent = 'Stopping...';
    
    try {
        const response = await fetch('/api/admin/server/stop', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Server stopped successfully', 'success');
            updateServerStatus('stopped');
            setTimeout(loadDashboardData, 2000); // Refresh data after 2 seconds
        } else {
            showToast('Failed to stop server: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Error stopping server: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Stop Server';
    }
}

async function restartServer() {
    const btn = document.getElementById('restart-server-btn');
    btn.disabled = true;
    btn.textContent = 'Restarting...';
    
    try {
        // Stop first
        await stopServer();
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Then start
        await startServer();
        
        showToast('Server restarted successfully', 'success');
    } catch (error) {
        showToast('Error restarting server: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Restart Server';
    }
}

function updateServerStatus(status) {
    const indicator = document.getElementById('server-status-indicator');
    const text = document.getElementById('server-status-text');
    const startBtn = document.getElementById('start-server-btn');
    const stopBtn = document.getElementById('stop-server-btn');
    const restartBtn = document.getElementById('restart-server-btn');
    
    // Reset all button states
    startBtn.disabled = false;
    stopBtn.disabled = false;
    restartBtn.disabled = false;
    
    switch(status) {
        case 'running':
            indicator.className = 'w-3 h-3 rounded-full bg-green-500';
            text.textContent = 'Server Running';
            startBtn.disabled = true;
            break;
        case 'stopped':
            indicator.className = 'w-3 h-3 rounded-full bg-red-500';
            text.textContent = 'Server Stopped';
            stopBtn.disabled = true;
            restartBtn.disabled = true;
            break;
        default:
            indicator.className = 'w-3 h-3 rounded-full bg-gray-400';
            text.textContent = 'Status Unknown';
            break;
    }
}

// Quick action functions
function viewEmailSubscriptions() {
    showToast('Email subscriptions management - Coming soon!', 'warning');
}

function viewServerLogs() {
    showToast('Server logs view - Coming soon!', 'warning');
}

function connectToChatServer() {
    showToast('Chat server management - Coming soon!', 'warning');
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    console.log('🔑 Admin token present:', !!adminToken);
    console.log('🎫 CSRF token present:', !!token);
    
    // Set up Socket.IO listeners first
    setupSocketListeners();
    
    // Load initial data via API (fallback)
    console.log('📊 Loading initial dashboard data...');
    loadDashboardData();
    
    // If Socket.IO is connected, request real-time data
    setTimeout(() => {
        if (isSocketConnected) {
            console.log('🔌 Socket.IO connected, requesting real-time data...');
            requestServerData();
        } else {
            console.log('🔌 Socket.IO not connected, using API only');
        }
    }, 1000);
});

// Refresh data periodically with dynamic interval based on connection status
let refreshInterval;

function setupRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    const interval = isSocketConnected ? 60000 : 15000; // 60s with Socket.IO, 15s without
    
    refreshInterval = setInterval(() => {
        if (isSocketConnected) {
            // With Socket.IO, refresh less frequently
            // Real-time updates handle most data changes
            requestServerData();
        } else {
            // Without Socket.IO, refresh more frequently
            loadDashboardData();
        }
    }, interval);
    
    console.log(`📊 Dashboard refresh interval set to ${interval/1000}s (Socket.IO: ${isSocketConnected ? 'connected' : 'disconnected'})`);
}

// Start initial refresh interval
setupRefreshInterval();
@endsection