@extends('layouts.admin')

@section('title', 'Bot Management - h2ktalk.fun Admin')

@section('styles')
<style>
.main-content {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.section {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    overflow: hidden;
}

.section-header {
    background: #0f172a;
    padding: 16px 20px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.section-title {
    color: #f8fafc;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.section-content {
    padding: 20px;
    height: calc(100vh - 300px);
    overflow-y: auto;
}

.bot-item {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.2s ease;
}

.bot-item:hover {
    border-color: #3b82f6;
    transform: translateY(-1px);
}

.bot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.bot-name {
    color: #3b82f6;
    font-weight: 600;
    font-size: 1rem;
}

.bot-status {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
}

.bot-status.online {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.bot-status.offline {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.bot-status.starting {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
}

.bot-status.paused {
    background: rgba(156, 163, 175, 0.2);
    color: #9ca3af;
}

.bot-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 0.8rem;
}

.bot-info-item {
    color: #94a3b8;
}

.bot-info-value {
    color: #f8fafc;
    font-weight: 500;
}

.bot-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
}

.btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.btn-small {
    padding: 4px 8px;
    font-size: 0.7rem;
}

.btn-danger {
    background: #ef4444;
}

.btn-danger:hover {
    background: #dc2626;
}

.btn-warning {
    background: #f59e0b;
}

.btn-warning:hover {
    background: #d97706;
}

.btn-success {
    background: #10b981;
}

.btn-success:hover {
    background: #059669;
}

.form-group {
    margin-bottom: 16px;
}

.form-label {
    display: block;
    color: #f8fafc;
    font-size: 0.9rem;
    margin-bottom: 6px;
    font-weight: 500;
}

.form-input, .form-select {
    width: 100%;
    background: #334155;
    color: #f8fafc;
    border: 1px solid #475569;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 0.9rem;
    font-family: inherit;
}

.form-input:focus, .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.control-panel {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 20px;
}

.control-panel h3 {
    color: #f8fafc;
    margin-bottom: 16px;
    font-size: 1rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 0.8rem;
    color: #94a3b8;
}

.stat-value.total { color: #3b82f6; }
.stat-value.active { color: #10b981; }
.stat-value.paused { color: #f59e0b; }
.stat-value.error { color: #ef4444; }

.empty-state {
    text-align: center;
    color: #64748b;
    padding: 40px 20px;
    font-style: italic;
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@media (max-width: 768px) {
    .main-content {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 16px;
    }
    
    .bot-info {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: 1fr 1fr;
    }
}
@endsection

@section('content')
<!-- Page Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                🤖 Bot Management
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Manage and monitor your automated bots in real-time.
            </p>
        </div>
        <div class="mt-4 flex md:ml-4 md:mt-0">
            <div class="connection-status">
                <div class="status-dot" id="connectionDot"></div>
                <span id="connectionStatus">Connected</span>
            </div>
            <a href="{{ route('admin.dashboard') }}" 
               class="ml-4 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m0 7h18"></path>
                </svg>
                Back to Dashboard
            </a>
        </div>
    </div>
</div>

<div class="main-content">
    <!-- Left Column - Active Bots -->
    <div class="section">
        <div class="section-header">
            <h2 class="section-title">🤖 Active Bots</h2>
            <button class="btn btn-small" onclick="refreshBots()">🔄 Refresh</button>
        </div>
        <div class="section-content">
            <div id="botsList">
                <div class="empty-state">No bots running</div>
            </div>
        </div>
    </div>

    <!-- Right Column - Bot Management -->
    <div class="section">
        <div class="section-header">
            <h2 class="section-title">⚙️ Bot Controls</h2>
        </div>
        <div class="section-content">
            <!-- Create New Bots -->
            <div class="control-panel">
                <h3>➕ Start New Bots</h3>
                
                <div class="form-group">
                    <label class="form-label">Bot Count:</label>
                    <input type="number" id="botCount" class="form-input" placeholder="Enter number of bots (e.g., 5)" min="1" max="100" value="5">
                </div>

                <div class="form-group">
                    <label class="form-label">Distribution Mode:</label>
                    <select id="distributionMode" class="form-select">
                        <option value="random">Random Distribution</option>
                        <option value="balanced">Balanced Distribution</option>
                        <option value="single_room">Single Room</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Target Room (for Single Room mode):</label>
                    <input type="text" id="targetRoom" class="form-input" placeholder="Room name or ID (optional)">
                </div>

                <div class="form-group">
                    <label class="form-label">Advanced Configuration (JSON):</label>
                    <textarea id="botConfig" class="form-input" rows="4" placeholder='{"chatFrequency": 30000, "moveFrequency": 60000}'></textarea>
                </div>

                <button class="btn" onclick="createBots()">🚀 Start Bots</button>
            </div>

            <!-- Global Bot Controls -->
            <div class="control-panel">
                <h3>🎛️ Global Bot Controls</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="startAllBots()">▶️ Start All</button>
                    <button class="btn btn-warning" onclick="pauseAllBots()">⏸️ Pause All</button>
                    <button class="btn btn-danger" onclick="stopAllBots()">⏹️ Stop All</button>
                    <button class="btn" onclick="reloadBotConfigs()">🔄 Reload Configs</button>
                </div>
            </div>

            <!-- Bot Statistics -->
            <div class="control-panel">
                <h3>📊 Bot Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value total" id="totalBots">-</div>
                        <div class="stat-label">Total Bots</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value active" id="activeBots">-</div>
                        <div class="stat-label">Active Bots</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value paused" id="pausedBots">-</div>
                        <div class="stat-label">Paused Bots</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value error" id="errorBots">-</div>
                        <div class="stat-label">Error Bots</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// WebSocket connection for real-time updates
const botSocket = io();
let isConnected = false;

// Connection handling
botSocket.on('connect', () => {
    isConnected = true;
    updateConnectionStatus(true);
    refreshBots();
});

botSocket.on('disconnect', () => {
    isConnected = false;
    updateConnectionStatus(false);
});

// Real-time bot updates
botSocket.on('botUpdate', (data) => {
    updateBotsList(data.bots || []);
    updateBotStats(data.stats || {});
});

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = document.getElementById('connectionDot');
    
    if (connected) {
        statusEl.textContent = 'Connected';
        dotEl.style.background = '#10b981';
    } else {
        statusEl.textContent = 'Disconnected';
        dotEl.style.background = '#ef4444';
    }
}

function updateBotsList(bots) {
    const botsList = document.getElementById('botsList');
    
    if (!bots || bots.length === 0) {
        botsList.innerHTML = '<div class="empty-state">No bots running</div>';
        return;
    }
    
    const botsHTML = bots.map(bot => `
        <div class="bot-item">
            <div class="bot-header">
                <div class="bot-name">${escapeHtml(bot.name || `Bot ${bot.id}`)}</div>
                <div class="bot-status ${bot.status}">${bot.status.toUpperCase()}</div>
            </div>
            <div class="bot-info">
                <div class="bot-info-item">
                    Room: <span class="bot-info-value">${escapeHtml(bot.currentRoom || 'None')}</span>
                </div>
                <div class="bot-info-item">
                    Uptime: <span class="bot-info-value">${formatUptime(bot.uptime || 0)}</span>
                </div>
                <div class="bot-info-item">
                    Messages: <span class="bot-info-value">${bot.messagesSent || 0}</span>
                </div>
                <div class="bot-info-item">
                    Type: <span class="bot-info-value">${escapeHtml(bot.type || 'Standard')}</span>
                </div>
            </div>
            <div class="bot-actions">
                ${bot.status === 'offline' ? 
                    `<button class="btn btn-success btn-small" onclick="startBot('${bot.id}')">▶️ Start</button>` :
                    `<button class="btn btn-warning btn-small" onclick="pauseBot('${bot.id}')">⏸️ Pause</button>`
                }
                <button class="btn btn-danger btn-small" onclick="stopBot('${bot.id}')">⏹️ Stop</button>
                <button class="btn btn-small" onclick="restartBot('${bot.id}')">🔄 Restart</button>
                <button class="btn btn-small" onclick="viewBotLogs('${bot.id}')">📋 Logs</button>
            </div>
        </div>
    `).join('');
    
    botsList.innerHTML = botsHTML;
}

function updateBotStats(stats) {
    document.getElementById('totalBots').textContent = stats.total || 0;
    document.getElementById('activeBots').textContent = stats.active || 0;
    document.getElementById('pausedBots').textContent = stats.paused || 0;
    document.getElementById('errorBots').textContent = stats.error || 0;
}

async function refreshBots() {
    try {
        const response = await fetch('/api/admin/bots', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateBotsList(data.bots || []);
            updateBotStats(data.stats || {});
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error('Failed to load bots');
        }
    } catch (error) {
        console.error('Error loading bots:', error);
        showToast('Error loading bots', 'error');
    }
}

async function createBots() {
    const botCount = parseInt(document.getElementById('botCount').value);
    const distributionMode = document.getElementById('distributionMode').value;
    const targetRoom = document.getElementById('targetRoom').value;
    const botConfigText = document.getElementById('botConfig').value;
    
    if (!botCount || botCount < 1 || botCount > 100) {
        showToast('Please enter a valid bot count (1-100)', 'error');
        return;
    }
    
    let botConfig = {};
    if (botConfigText.trim()) {
        try {
            botConfig = JSON.parse(botConfigText);
        } catch (error) {
            showToast('Invalid JSON configuration', 'error');
            return;
        }
    }
    
    const requestData = {
        count: botCount,
        distributionMode: distributionMode,
        targetRoom: targetRoom || null,
        config: botConfig
    };
    
    try {
        const response = await fetch('/api/admin/bots/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            showToast(`Starting ${botCount} bots...`, 'success');
            refreshBots();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create bots');
        }
    } catch (error) {
        console.error('Error creating bots:', error);
        showToast(`Error creating bots: ${error.message}`, 'error');
    }
}

async function startBot(botId) {
    await sendBotCommand('start', botId);
}

async function pauseBot(botId) {
    await sendBotCommand('pause', botId);
}

async function stopBot(botId) {
    await sendBotCommand('stop', botId);
}

async function restartBot(botId) {
    await sendBotCommand('restart', botId);
}

async function sendBotCommand(action, botId) {
    try {
        const response = await fetch(`/api/admin/bots/${botId}/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast(`Bot ${action} command sent`, 'success');
            refreshBots();
        } else {
            throw new Error(`Failed to ${action} bot`);
        }
    } catch (error) {
        console.error(`Error ${action} bot:`, error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function startAllBots() {
    await sendGlobalBotCommand('start-all');
}

async function pauseAllBots() {
    await sendGlobalBotCommand('pause-all');
}

async function stopAllBots() {
    if (!confirm('Are you sure you want to stop all bots?')) {
        return;
    }
    await sendGlobalBotCommand('stop-all');
}

async function reloadBotConfigs() {
    await sendGlobalBotCommand('reload-configs');
}

async function sendGlobalBotCommand(action) {
    try {
        const response = await fetch(`/api/admin/bots/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast(`${action.replace('-', ' ')} command sent`, 'success');
            refreshBots();
        } else {
            throw new Error(`Failed to ${action}`);
        }
    } catch (error) {
        console.error(`Error ${action}:`, error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

function viewBotLogs(botId) {
    // Open bot logs in a new window or modal
    window.open(`/admin/bot-logs/${botId}`, '_blank', 'width=800,height=600');
}

function formatUptime(seconds) {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    if (typeof text !== 'string') {
        text = String(text);
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Load bots when page loads
document.addEventListener('DOMContentLoaded', () => {
    refreshBots();
});

// Auto-refresh bots every 10 seconds
setInterval(refreshBots, 10000);
@endsection
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
}

.bots-table td {
    padding: 16px;
    border-bottom: 1px solid #f3f4f6;
    color: #111827;
    font-size: 0.875rem;
}

.bots-table tbody tr:hover {
    background: #f9fafb;
}

.bots-table tbody tr:last-child td {
    border-bottom: none;
}

.bot-status {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.bot-status.online {
    background: #dcfce7;
    color: #166534;
}

.bot-status.offline {
    background: #fef2f2;
    color: #991b1b;
}

.bot-status.starting {
    background: #fef3c7;
    color: #92400e;
}

.bot-status.error {
    background: #fecaca;
    color: #991b1b;
}

.bot-type {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: #e0e7ff;
    color: #3730a3;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
}

.btn-start {
    background: #dcfce7;
    color: #166534;
}

.btn-start:hover {
    background: #bbf7d0;
}

.btn-stop {
    background: #fecaca;
    color: #991b1b;
}

.btn-stop:hover {
    background: #fca5a5;
}

.btn-restart {
    background: #fef3c7;
    color: #92400e;
}

.btn-restart:hover {
    background: #fde68a;
}

.btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
}

.btn-primary {
    background: #3b82f6;
    color: white;
}

.btn-primary:hover {
    background: #2563eb;
}

.btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
}

.btn-secondary:hover {
    background: #f9fafb;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
}

.form-input,
.form-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
    color: #111827;
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.loading-text,
.no-bots {
    text-align: center;
    color: #6b7280;
    padding: 3rem;
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .form-grid {
        grid-template-columns: 1fr;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .bots-table {
        font-size: 0.75rem;
    }
}
@endsection

@section('content')
<!-- Page Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Bot Management
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Manage automated bot users and their behavior in chat rooms.
            </p>
        </div>
        <div class="mt-4 flex md:ml-4 md:mt-0">
            <a href="{{ route('admin.dashboard') }}" 
               class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m0 7h18"></path>
                </svg>
                Back to Dashboard
            </a>
        </div>
    </div>
</div>

<!-- Stats Grid -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-value" id="totalBots">-</div>
        <div class="stat-label">Total Bots</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="activeBots">-</div>
        <div class="stat-label">Active Bots</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="offlineBots">-</div>
        <div class="stat-label">Offline Bots</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="errorBots">-</div>
        <div class="stat-label">Error Bots</div>
    </div>
</div>

<!-- Add New Bot Card -->
<div class="bg-white shadow rounded-lg mb-6">
    <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
        <h3 class="text-lg font-medium leading-6 text-gray-900">Add New Bot</h3>
        <p class="mt-1 text-sm text-gray-500">Configure and start a new automated bot user.</p>
    </div>
    <div class="px-4 py-5 sm:p-6">
        <form id="addBotForm">
            <div class="form-grid">
                <div class="form-group">
                    <label for="botName" class="form-label">Bot Name</label>
                    <input type="text" id="botName" name="name" class="form-input" placeholder="Enter bot name" required>
                </div>
                
                <div class="form-group">
                    <label for="botType" class="form-label">Bot Type</label>
                    <select id="botType" name="type" class="form-select" required>
                        <option value="">Select bot type</option>
                        <option value="greeter">Greeter Bot</option>
                        <option value="moderator">Moderator Bot</option>
                        <option value="announcer">Announcer Bot</option>
                        <option value="chatbot">Chat Bot</option>
                        <option value="custom">Custom Bot</option>
                    </select>
                </div>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="botRoom" class="form-label">Target Room</label>
                    <input type="text" id="botRoom" name="room" class="form-input" placeholder="Room name or ID">
                </div>
                
                <div class="form-group">
                    <label for="botInterval" class="form-label">Action Interval (seconds)</label>
                    <input type="number" id="botInterval" name="interval" class="form-input" placeholder="60" min="10" max="3600">
                </div>
            </div>
            
            <div class="form-group">
                <label for="botMessage" class="form-label">Bot Message/Script</label>
                <textarea id="botMessage" name="message" class="form-input" rows="3" placeholder="Enter bot message or script"></textarea>
            </div>
            
            <div class="flex justify-end">
                <button type="submit" class="btn btn-primary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Start Bot
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Active Bots Table -->
<div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
        <div class="md:flex md:items-center md:justify-between">
            <div class="min-w-0 flex-1">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Active Bots</h3>
                <p class="mt-1 text-sm text-gray-500">Currently running bots and their status.</p>
            </div>
            <div class="mt-4 md:ml-4 md:mt-0">
                <button class="btn btn-secondary" onclick="loadBots()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                </button>
            </div>
        </div>
    </div>
    
    <div id="botsContent" class="loading-text">
        <div class="flex items-center justify-center py-12">
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="text-gray-500">Loading bots...</span>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load bot statistics and list
async function loadBots() {
    try {
        const response = await fetch('/api/admin/bots/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateStats(data.stats || {});
            renderBots(data.bots || []);
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error('Failed to load bots');
        }
    } catch (error) {
        console.error('Error loading bots:', error);
        document.getElementById('botsContent').innerHTML = 
            '<div class="no-bots">Error loading bots. Bot server may be offline.</div>';
    }
}

// Update statistics
function updateStats(stats) {
    document.getElementById('totalBots').textContent = stats.totalBots || 0;
    document.getElementById('activeBots').textContent = stats.activeBots || 0;
    document.getElementById('offlineBots').textContent = (stats.totalBots || 0) - (stats.activeBots || 0);
    document.getElementById('errorBots').textContent = stats.errorBots || 0;
}

// Render bots table
function renderBots(bots) {
    const botsContent = document.getElementById('botsContent');
    
    if (bots.length === 0) {
        botsContent.innerHTML = '<div class="no-bots">No bots are currently configured.</div>';
        return;
    }
    
    let tableHTML = `
        <table class="bots-table">
            <thead>
                <tr>
                    <th>Bot Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Room</th>
                    <th>Uptime</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    bots.forEach(bot => {
        const statusClass = getBotStatusClass(bot.status);
        const uptime = formatUptime(bot.uptime || 0);
        
        tableHTML += `
            <tr>
                <td>
                    <div class="font-medium text-gray-900">${escapeHtml(bot.name)}</div>
                    <div class="text-sm text-gray-500">ID: ${bot.id}</div>
                </td>
                <td><span class="bot-type">${escapeHtml(bot.type || 'Unknown')}</span></td>
                <td><span class="bot-status ${statusClass}">${escapeHtml(bot.status || 'Unknown')}</span></td>
                <td><span class="text-sm">${escapeHtml(bot.room || 'N/A')}</span></td>
                <td><span class="text-sm">${uptime}</span></td>
                <td>
                    <div class="action-buttons">
                        ${bot.status === 'online' ? 
                            `<button class="action-btn btn-stop" onclick="stopBot('${bot.id}')">Stop</button>
                             <button class="action-btn btn-restart" onclick="restartBot('${bot.id}')">Restart</button>` :
                            `<button class="action-btn btn-start" onclick="startBot('${bot.id}')">Start</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    botsContent.innerHTML = tableHTML;
}

// Get bot status CSS class
function getBotStatusClass(status) {
    switch(status) {
        case 'online':
        case 'running':
            return 'online';
        case 'offline':
        case 'stopped':
            return 'offline';
        case 'starting':
        case 'loading':
            return 'starting';
        case 'error':
        case 'failed':
            return 'error';
        default:
            return 'offline';
    }
}

// Format uptime
function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// Start a bot
async function startBot(botId) {
    try {
        const response = await fetch('/api/admin/bots/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ botId })
        });
        
        if (response.ok) {
            showToast('Bot started successfully', 'success');
            loadBots();
        } else {
            throw new Error('Failed to start bot');
        }
    } catch (error) {
        console.error('Error starting bot:', error);
        showToast('Error starting bot', 'error');
    }
}

// Stop a bot
async function stopBot(botId) {
    try {
        const response = await fetch('/api/admin/bots/stop', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ botId })
        });
        
        if (response.ok) {
            showToast('Bot stopped successfully', 'success');
            loadBots();
        } else {
            throw new Error('Failed to stop bot');
        }
    } catch (error) {
        console.error('Error stopping bot:', error);
        showToast('Error stopping bot', 'error');
    }
}

// Restart a bot
async function restartBot(botId) {
    try {
        const response = await fetch('/api/admin/bots/restart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ botId })
        });
        
        if (response.ok) {
            showToast('Bot restarted successfully', 'success');
            loadBots();
        } else {
            throw new Error('Failed to restart bot');
        }
    } catch (error) {
        console.error('Error restarting bot:', error);
        showToast('Error restarting bot', 'error');
    }
}

// Handle add bot form submission
document.getElementById('addBotForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('botName').value,
        type: document.getElementById('botType').value,
        room: document.getElementById('botRoom').value,
        interval: parseInt(document.getElementById('botInterval').value) || 60,
        message: document.getElementById('botMessage').value
    };
    
    try {
        const response = await fetch('/api/admin/bots/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast('Bot created and started successfully', 'success');
            document.getElementById('addBotForm').reset();
            loadBots();
        } else {
            throw new Error('Failed to create bot');
        }
    } catch (error) {
        console.error('Error creating bot:', error);
        showToast('Error creating bot', 'error');
    }
});

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Load bots when page loads
document.addEventListener('DOMContentLoaded', loadBots);

// Auto-refresh every 10 seconds
setInterval(loadBots, 10000);
@endsection