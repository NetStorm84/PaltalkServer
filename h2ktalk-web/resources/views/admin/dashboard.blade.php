@extends('layouts.app')

@section('title', 'Admin Dashboard - h2ktalk.fun')

@section('styles')
.admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.admin-header h1 {
    color: #ffffff;
    font-size: 1.8rem;
}

.logout-btn {
    background: rgba(220, 38, 38, 0.8);
    border: 2px solid #dc2626;
    padding: 8px 16px;
    font-size: 0.9rem;
}

.logout-btn:hover {
    background: #dc2626;
    border-color: #dc2626;
    color: #ffffff;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
}

.stat-card h3 {
    color: #ff4500;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 0.5rem;
}

.stat-description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
}

.admin-section {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.admin-section h2 {
    color: #ffffff;
    margin-bottom: 1rem;
    font-size: 1.3rem;
}

.admin-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.action-btn {
    display: block;
    text-align: center;
    padding: 1rem;
    background: rgba(255, 69, 0, 0.1);
    border: 1px solid #ff4500;
    border-radius: 4px;
    color: #ffffff;
    text-decoration: none;
    transition: all 0.2s ease;
}

.action-btn:hover {
    background: rgba(255, 69, 0, 0.2);
    border-color: #ff6600;
}

.loading-text {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}

@media (max-width: 768px) {
    .admin-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .admin-actions {
        grid-template-columns: 1fr;
    }
}
@endsection

@section('content')
<div class="admin-header">
    <h1>🛠️ Admin Dashboard</h1>
    <button class="btn logout-btn" onclick="logout()">Logout</button>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <h3>Total Users</h3>
        <div class="stat-value" id="totalUsers">-</div>
        <div class="stat-description">Registered accounts</div>
    </div>
    
    <div class="stat-card">
        <h3>Active Users</h3>
        <div class="stat-value" id="activeUsers">-</div>
        <div class="stat-description">Currently enabled accounts</div>
    </div>
    
    <div class="stat-card">
        <h3>Admin Users</h3>
        <div class="stat-value" id="adminUsers">-</div>
        <div class="stat-description">Level 2+ administrators</div>
    </div>
    
    <div class="stat-card">
        <h3>Online Users</h3>
        <div class="stat-value" id="onlineUsers">-</div>
        <div class="stat-description">Currently connected</div>
    </div>
    
    <div class="stat-card">
        <h3>Active Rooms</h3>
        <div class="stat-value" id="activeRooms">-</div>
        <div class="stat-description">Rooms with users</div>
    </div>
    
    <div class="stat-card">
        <h3>Total Connections</h3>
        <div class="stat-value" id="totalConnections">-</div>
        <div class="stat-description">Server connections</div>
    </div>
    
    <div class="stat-card">
        <h3>Server Uptime</h3>
        <div class="stat-value" id="serverUptime">-</div>
        <div class="stat-description">Time since restart</div>
    </div>
    
    <div class="stat-card">
        <h3>Voice Sessions</h3>
        <div class="stat-value" id="voiceSessions">-</div>
        <div class="stat-description">Active voice users</div>
    </div>
</div>

<div class="admin-section">
    <h2>📊 Server Status</h2>
    <div id="serverStatus" class="loading-text">Loading server information...</div>
</div>

<div class="admin-section">
    <h2>⚡ Quick Actions</h2>
    <div class="admin-actions">
        <a href="{{ route('admin.users') }}" class="action-btn">
            👥 Manage Users
        </a>
        <a href="{{ route('admin.packet-logs') }}" class="action-btn">
            📋 Packet Logs
        </a>
        <a href="{{ route('admin.voice-logs') }}" class="action-btn">
            🎙️ Voice Logs
        </a>
        <a href="{{ route('admin.bot-management') }}" class="action-btn">
            🤖 Bot Management
        </a>
        <a href="#" class="action-btn" onclick="viewEmailSubscriptions()">
            📧 Email Subscriptions
        </a>
        <a href="#" class="action-btn" onclick="connectToChatServer()">
            💬 Chat Server Status
        </a>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
let isSocketConnected = false;

// Check if user is logged in
if (!adminToken) {
    console.warn('⚠️ No admin token found, creating temporary token for development');
    // For development/testing, create a temporary admin token
    adminToken = 'admin-dev-token';
    localStorage.setItem('admin_token', adminToken);
}

// Socket.IO event handlers for dashboard
function setupSocketListeners() {
    console.log('🔌 Setting up Socket.IO listeners...');
    
    if (typeof io === 'undefined') {
        console.warn('⚠️ Socket.IO library not available');
        return;
    }
    
    try {
        // Try to connect to Node.js server for real-time updates
        const chatServerUrl = 'http://localhost:3000';
        window.dashboardSocket = io(chatServerUrl);
        
        window.dashboardSocket.on('connect', () => {
            console.log('✅ Dashboard connected to chat server');
            isSocketConnected = true;
            requestServerData();
        });
        
        window.dashboardSocket.on('disconnect', () => {
            console.log('❌ Dashboard disconnected from chat server');
            isSocketConnected = false;
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
    
    if (data.server) {
        document.getElementById('serverUptime').textContent = data.server.uptime || 'Unknown';
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
            const activeUsersEl = document.getElementById('activeUsers'); 
            const adminUsersEl = document.getElementById('adminUsers');
            
            console.log('📊 Elements found:', {
                totalUsers: !!totalUsersEl,
                activeUsers: !!activeUsersEl,
                adminUsers: !!adminUsersEl
            });
            
            if (totalUsersEl) totalUsersEl.textContent = serverData.database?.users_total || 0;
            if (activeUsersEl) activeUsersEl.textContent = serverData.database?.users_active || 0;
            if (adminUsersEl) adminUsersEl.textContent = serverData.database?.admins || 0;
            
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
            
            // Update server info
            console.log('📊 Updating server info...');
            if (serverData.server) {
                const serverUptimeEl = document.getElementById('serverUptime');
                if (serverUptimeEl) serverUptimeEl.textContent = serverData.server.uptime || 'Unknown';
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
            
            // Update server status display
            const statusDiv = document.getElementById('serverStatus');
            const isOnline = !serverData.error;
            
            statusDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div>
                        <strong>Chat Server:</strong><br>
                        Status: <span style="color: ${isOnline ? '#4ade80' : '#ef4444'};">${isOnline ? 'Online' : 'Offline'}</span><br>
                        Port: ${serverData.server?.port || 5001}<br>
                        Version: ${serverData.server?.version || '1.0.0'}
                    </div>
                    <div>
                        <strong>Voice Server:</strong><br>
                        Status: <span style="color: ${serverData.voice ? '#4ade80' : '#ef4444'};">${serverData.voice ? 'Online' : 'Offline'}</span><br>
                        Port: ${serverData.voice?.port || 2090}<br>
                        Sessions: ${serverData.voice?.activeSessions || 0}
                    </div>
                    <div>
                        <strong>Database:</strong><br>
                        Status: <span style="color: #4ade80;">Connected</span><br>
                        Users: ${serverData.database?.users_total || 0}<br>
                        Active: ${serverData.database?.users_active || 0}
                    </div>
                    <div>
                        <strong>Performance:</strong><br>
                        CPU: ${serverData.performance?.cpu || 'N/A'}<br>
                        Memory: ${serverData.performance?.memory || 'N/A'}<br>
                        Uptime: ${serverData.server?.uptime || 'Unknown'}
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <strong>Active Users:</strong><br>
                            ${(serverData.users || []).slice(0, 3).map(user => `<span style="color: #4ade80;">${user.nickname || user.name}</span>`).join(', ')}
                            ${(serverData.users || []).length > 3 ? `<span style="color: rgba(255,255,255,0.7);"> +${(serverData.users || []).length - 3} more</span>` : ''}
                        </div>
                        <div>
                            <strong>Popular Rooms:</strong><br>
                            ${(serverData.rooms || []).slice(0, 3).map(room => `<span style="color: #ff4500;">${room.name}</span> (${room.userCount})`).join('<br>')}
                        </div>
                    </div>
                </div>
                <p style="margin-top: 1rem; color: rgba(255, 255, 255, 0.7); font-style: italic;">
                    ${serverData.error ? `⚠️ ${serverData.error}` : '✅ All systems operational'}
                </p>
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
        document.getElementById('activeUsers').textContent = '0';
        document.getElementById('adminUsers').textContent = '0';
        document.getElementById('onlineUsers').textContent = '0';
        document.getElementById('activeRooms').textContent = '0';
        document.getElementById('totalConnections').textContent = '0';
        document.getElementById('serverUptime').textContent = 'Unknown';
        document.getElementById('voiceSessions').textContent = '0';
        
        document.getElementById('serverStatus').innerHTML = 
            '<span style="color: #ef4444;">⚠️ Unable to connect to chat server. Dashboard showing local data only.</span>';
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('admin_token');
    window.location.href = '{{ route("admin.login") }}';
}

// Quick action functions
function viewEmailSubscriptions() {
    // TODO: Implement email subscriptions view
    alert('Email subscriptions management - Coming soon!');
}

function viewServerLogs() {
    // TODO: Implement server logs view
    alert('Server logs view - Coming soon!');
}

function connectToChatServer() {
    // TODO: Implement chat server connection
    alert('Chat server management - Coming soon!');
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