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
        <h3>Email Notifications</h3>
        <div class="stat-value" id="emailNotifications">-</div>
        <div class="stat-description">Active subscriptions</div>
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
        <a href="#" class="action-btn" onclick="viewEmailSubscriptions()">
            📧 Email Subscriptions
        </a>
        <a href="#" class="action-btn" onclick="viewServerLogs()">
            📋 Server Logs
        </a>
        <a href="#" class="action-btn" onclick="connectToChatServer()">
            💬 Chat Server Status
        </a>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load basic stats
        const statsResponse = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token
            }
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('totalUsers').textContent = stats.users?.total || 0;
            document.getElementById('activeUsers').textContent = stats.users?.active || 0;
            document.getElementById('adminUsers').textContent = stats.users?.admins || 0;
            document.getElementById('emailNotifications').textContent = stats.notifications?.active || 0;
        }
        
        // Load server state
        const serverResponse = await fetch('/api/server-state', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-CSRF-TOKEN': token
            }
        });
        
        if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            const statusDiv = document.getElementById('serverStatus');
            statusDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <strong>Laravel Server:</strong><br>
                        Status: <span style="color: #4ade80;">Running</span><br>
                        Version: ${serverData.server?.version || '1.0.0'}
                    </div>
                    <div>
                        <strong>Database:</strong><br>
                        Users: ${serverData.database?.users_total || 0}<br>
                        Active: ${serverData.database?.users_active || 0}
                    </div>
                    <div>
                        <strong>Chat Server:</strong><br>
                        Port: ${serverData.chat_server?.port || 5001}<br>
                        Voice Port: ${serverData.chat_server?.voice_port || 2090}
                    </div>
                </div>
                <p style="margin-top: 1rem; color: rgba(255, 255, 255, 0.7); font-style: italic;">
                    ${serverData.message || 'Server running normally'}
                </p>
            `;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('serverStatus').innerHTML = 
            '<span style="color: #ef4444;">Error loading server data</span>';
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
document.addEventListener('DOMContentLoaded', loadDashboardData);

// Refresh data every 30 seconds
setInterval(loadDashboardData, 30000);
@endsection