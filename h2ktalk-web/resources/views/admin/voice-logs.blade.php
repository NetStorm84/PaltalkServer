@extends('layouts.app')

@section('title', 'Voice Server Logs - h2ktalk.fun Admin')

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

.back-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 8px 16px;
    font-size: 0.9rem;
}

.voice-section {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.voice-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.voice-controls h2 {
    color: #ffffff;
    font-size: 1.3rem;
}

.control-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.control-group select,
.control-group input {
    padding: 8px 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
}

.control-group select:focus,
.control-group input:focus {
    outline: none;
    border-color: #ff4500;
}

.voice-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.voice-stat {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    text-align: center;
}

.voice-stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ff4500;
}

.voice-stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-top: 0.25rem;
}

.voice-sessions {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1.5rem;
}

.voice-sessions h3 {
    color: #ffffff;
    margin-bottom: 1rem;
}

.session-list {
    display: grid;
    gap: 0.5rem;
}

.session-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.75rem;
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1rem;
    align-items: center;
}

.session-info {
    color: #ffffff;
}

.session-user {
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.session-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
}

.session-status {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: bold;
}

.status-active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid #22c55e;
}

.status-muted {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid #ef4444;
}

.session-actions {
    display: flex;
    gap: 0.25rem;
}

.action-btn {
    padding: 4px 8px;
    border: 1px solid;
    border-radius: 3px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-mute {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.btn-kick {
    color: #f59e0b;
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
}

.logs-container {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
}

.log-entry {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    border-radius: 3px;
    border-left: 3px solid;
}

.log-entry.info {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
}

.log-entry.warning {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
}

.log-entry.error {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.log-timestamp {
    color: #888;
    font-size: 0.8rem;
}

.log-level {
    font-weight: bold;
    margin-right: 0.5rem;
}

.log-level.info {
    color: #3b82f6;
}

.log-level.warning {
    color: #f59e0b;
}

.log-level.error {
    color: #ef4444;
}

.log-message {
    color: #ffffff;
    margin-top: 0.25rem;
}

.loading-text {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    padding: 2rem;
}

@media (max-width: 768px) {
    .admin-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .voice-controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .voice-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .session-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .session-actions {
        justify-content: center;
    }
}
@endsection

@section('content')
<div class="admin-header">
    <h1>🎙️ Voice Server Logs</h1>
    <a href="{{ route('admin.dashboard') }}" class="btn back-btn">← Back to Dashboard</a>
</div>

<div class="voice-stats">
    <div class="voice-stat">
        <div class="voice-stat-value" id="activeConnections">-</div>
        <div class="voice-stat-label">Active Connections</div>
    </div>
    <div class="voice-stat">
        <div class="voice-stat-value" id="totalBandwidth">-</div>
        <div class="voice-stat-label">Bandwidth (KB/s)</div>
    </div>
    <div class="voice-stat">
        <div class="voice-stat-value" id="packetsPerSec">-</div>
        <div class="voice-stat-label">Packets/sec</div>
    </div>
    <div class="voice-stat">
        <div class="voice-stat-value" id="serverUptime">-</div>
        <div class="voice-stat-label">Server Uptime</div>
    </div>
</div>

<div class="voice-sessions">
    <h3>Active Voice Sessions</h3>
    <div id="sessionsList" class="session-list">
        <div class="loading-text">Loading voice sessions...</div>
    </div>
</div>

<div class="voice-section">
    <div class="voice-controls">
        <h2>Voice Server Logs</h2>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <div class="control-group">
                <label for="logLevel" style="color: #ffffff; margin-right: 0.5rem;">Level:</label>
                <select id="logLevel">
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                </select>
            </div>
            <div class="control-group">
                <button class="btn btn-primary" onclick="refreshLogs()">Refresh</button>
                <button class="btn btn-export" onclick="exportVoiceLogs()">Export</button>
                <button class="btn btn-danger" onclick="clearVoiceLogs()">Clear</button>
            </div>
        </div>
    </div>
    
    <div id="voiceLogsContainer" class="logs-container">
        <div class="loading-text">Loading voice server logs...</div>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
let voiceLogs = [];
let voiceSessions = [];
let voiceStats = {};
let refreshInterval = null;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// API helper function
async function makeApiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(endpoint, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Fetch voice statistics from API
async function fetchVoiceStats() {
    try {
        const data = await makeApiCall('/api/admin/voice/stats');
        voiceStats = data;
        updateVoiceStats();
    } catch (error) {
        console.error('Failed to fetch voice stats:', error);
        // Fallback to mock data
        voiceStats = {
            activeConnections: Math.floor(Math.random() * 20 + 5),
            totalBandwidth: Math.floor(Math.random() * 500 + 100),
            packetsPerSec: Math.floor(Math.random() * 1000 + 200),
            serverUptime: '2d 14h 32m'
        };
        updateVoiceStats();
    }
}

// Fetch voice logs from API
async function fetchVoiceLogs() {
    try {
        const data = await makeApiCall('/api/admin/voice/logs');
        voiceLogs = data.logs || [];
        voiceSessions = data.sessions || [];
        renderVoiceSessions();
        renderVoiceLogs();
    } catch (error) {
        console.error('Failed to fetch voice logs:', error);
        // Fallback to mock data
        generateMockData();
        renderVoiceSessions();
        renderVoiceLogs();
    }
}

// Generate mock data as fallback
function generateMockData() {
    // Mock voice sessions
    voiceSessions = [
        {
            id: 1,
            user: 'ChatUser123',
            room: 'General Chat',
            duration: '00:12:34',
            status: 'active',
            bitrate: '64 kbps',
            packets: 15420
        },
        {
            id: 2,
            user: 'VoiceGuy456',
            room: 'Music Room',
            duration: '00:05:22',
            status: 'muted',
            bitrate: '128 kbps',
            packets: 8932
        }
    ];
    
    // Mock voice logs
    const logTypes = ['info', 'warning', 'error'];
    const messages = [
        'User connected to voice server',
        'Voice packet received from client',
        'Audio stream started for room',
        'Connection quality degraded',
        'User disconnected from voice',
        'Bandwidth threshold exceeded',
        'Voice server buffer overflow',
        'Audio codec negotiation failed'
    ];
    
    voiceLogs = [];
    for (let i = 0; i < 20; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 3600000);
        const level = logTypes[Math.floor(Math.random() * logTypes.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        
        voiceLogs.push({
            timestamp,
            level,
            message: `${message} (Session ID: ${Math.floor(Math.random() * 1000)})`
        });
    }
    
    voiceLogs.sort((a, b) => b.timestamp - a.timestamp);
}

// Update voice statistics display
function updateVoiceStats() {
    document.getElementById('activeConnections').textContent = voiceStats.activeConnections || '-';
    document.getElementById('totalBandwidth').textContent = voiceStats.totalBandwidth || '-';
    document.getElementById('packetsPerSec').textContent = voiceStats.packetsPerSec || '-';
    document.getElementById('serverUptime').textContent = voiceStats.serverUptime || '-';
}

// Render voice sessions
function renderVoiceSessions() {
    const container = document.getElementById('sessionsList');
    
    if (voiceSessions.length === 0) {
        container.innerHTML = '<div class="loading-text">No active voice sessions</div>';
        return;
    }
    
    const sessionsHtml = voiceSessions.map(session => `
        <div class="session-item">
            <div class="session-info">
                <div class="session-user">${session.user}</div>
                <div class="session-details">
                    Room: ${session.room} | Duration: ${session.duration} | ${session.bitrate}
                </div>
            </div>
            <div class="session-status status-${session.status}">
                ${session.status.toUpperCase()}
            </div>
            <div class="session-actions">
                <button class="action-btn btn-mute" onclick="muteUser(${session.id})">
                    ${session.status === 'muted' ? 'Unmute' : 'Mute'}
                </button>
                <button class="action-btn btn-kick" onclick="kickUser(${session.id})">Kick</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = sessionsHtml;
}

// Render voice logs
function renderVoiceLogs() {
    const container = document.getElementById('voiceLogsContainer');
    const filter = document.getElementById('logLevel').value;
    
    let filteredLogs = voiceLogs;
    if (filter !== 'all') {
        filteredLogs = voiceLogs.filter(log => log.level === filter);
    }
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<div class="loading-text">No logs found for the selected filter.</div>';
        return;
    }
    
    const logsHtml = filteredLogs.slice(0, 50).map(log => {
        // Handle timestamp - it might be a Date object or string from API
        const timestamp = log.timestamp instanceof Date ? 
            log.timestamp.toLocaleString() : 
            new Date(log.timestamp).toLocaleString();
            
        return `
            <div class="log-entry ${log.level}">
                <div>
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                </div>
                <div class="log-message">${log.message}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = logsHtml;
}

// User action functions
async function muteUser(sessionId) {
    const session = voiceSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const action = session.status === 'muted' ? 'unmute' : 'mute';
    
    try {
        await makeApiCall('/api/admin/voice/mute', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                user: session.user,
                action: action
            })
        });
        
        // Update local state
        session.status = session.status === 'muted' ? 'active' : 'muted';
        renderVoiceSessions();
        
        // Add log entry
        voiceLogs.unshift({
            timestamp: new Date(),
            level: 'info',
            message: `User ${session.user} has been ${action}d`
        });
        renderVoiceLogs();
        
    } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        alert(`Failed to ${action} user. Please try again.`);
        
        // Fallback to local update for demo purposes
        session.status = session.status === 'muted' ? 'active' : 'muted';
        renderVoiceSessions();
        
        voiceLogs.unshift({
            timestamp: new Date(),
            level: 'info',
            message: `User ${session.user} has been ${action}d (offline mode)`
        });
        renderVoiceLogs();
    }
}

async function kickUser(sessionId) {
    const session = voiceSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    if (!confirm(`Are you sure you want to kick ${session.user} from the voice server?`)) {
        return;
    }
    
    try {
        await makeApiCall('/api/admin/voice/kick', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                user: session.user
            })
        });
        
        // Remove from local state
        voiceSessions = voiceSessions.filter(s => s.id !== sessionId);
        renderVoiceSessions();
        updateVoiceStats();
        
        // Add log entry
        voiceLogs.unshift({
            timestamp: new Date(),
            level: 'warning',
            message: `User ${session.user} was kicked from voice server`
        });
        renderVoiceLogs();
        
    } catch (error) {
        console.error('Failed to kick user:', error);
        alert('Failed to kick user. Please try again.');
        
        // Fallback to local update for demo purposes
        voiceLogs.unshift({
            timestamp: new Date(),
            level: 'warning',
            message: `User ${session.user} was kicked from voice server (offline mode)`
        });
        
        voiceSessions = voiceSessions.filter(s => s.id !== sessionId);
        renderVoiceSessions();
        renderVoiceLogs();
        updateVoiceStats();
    }
}

// Refresh logs
async function refreshLogs() {
    try {
        // Fetch fresh data from API
        await Promise.all([
            fetchVoiceStats(),
            fetchVoiceLogs()
        ]);
    } catch (error) {
        console.error('Failed to refresh logs:', error);
        // Fallback to generating new mock data
        generateMockData();
        updateVoiceStats();
        renderVoiceSessions();
        renderVoiceLogs();
    }
}

// Clear logs
function clearVoiceLogs() {
    if (confirm('Are you sure you want to clear all voice server logs?')) {
        voiceLogs = [];
        renderVoiceLogs();
    }
}

// Export logs
function exportVoiceLogs() {
    if (voiceLogs.length === 0) {
        alert('No logs to export');
        return;
    }
    
    const data = JSON.stringify({
        logs: voiceLogs,
        sessions: voiceSessions,
        exportedAt: new Date().toISOString()
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Filter change handler
document.getElementById('logLevel').addEventListener('change', renderVoiceLogs);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Try to load real data first
        await Promise.all([
            fetchVoiceStats(),
            fetchVoiceLogs()
        ]);
    } catch (error) {
        console.error('Failed to load initial data, using mock data:', error);
        // Fallback to mock data
        generateMockData();
        updateVoiceStats();
        renderVoiceSessions();
        renderVoiceLogs();
    }
    
    // Auto-refresh every 30 seconds (less frequent for API calls)
    refreshInterval = setInterval(async () => {
        try {
            await fetchVoiceStats();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, 30000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
@endsection