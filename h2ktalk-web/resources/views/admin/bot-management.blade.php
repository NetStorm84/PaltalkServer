@extends('layouts.admin')

@section('title', 'Bot Management - h2ktalk.fun Admin')

@section('styles')
<style>
/* Bot management specific styles */
.stats-card {
    transition: all 0.2s ease;
}

.stats-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.bot-item {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.bot-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.bot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.bot-name {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.bot-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}

.bot-info-item {
    color: #6b7280;
    font-size: 14px;
}

.bot-info-label {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: 4px;
}

.bot-info-value {
    color: #111827;
    font-weight: 500;
}

.bot-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.bot-status {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}

.bot-status.online {
    background: #dcfce7;
    color: #166534;
}

.bot-status.offline {
    background: #fee2e2;
    color: #991b1b;
}

.bot-status.paused {
    background: #fef3c7;
    color: #92400e;
}

.bot-status.starting {
    background: #dbeafe;
    color: #1e40af;
}

.connection-status {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.connection-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dc2626;
    animation: pulse 2s infinite;
}

.connection-indicator.connected {
    background: #10b981;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.logs-container {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    max-height: 300px;
    overflow-y: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
}

.log-entry {
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
}

.log-entry:last-child {
    border-bottom: none;
}

.log-entry.error {
    color: #dc2626;
    background: #fef2f2;
}

.log-entry.warning {
    color: #f59e0b;
    background: #fffbeb;
}

.log-entry.info {
    color: #3b82f6;
    background: #eff6ff;
}

@media (max-width: 768px) {
    .bot-info {
        grid-template-columns: 1fr;
    }
}
</style>
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
            <button type="button" 
                    onclick="refreshBots()" 
                    class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                <svg class="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
            </button>
        </div>
    </div>
</div>

<!-- Connection Status -->
<div class="connection-status mb-6">
    <div class="flex items-center">
        <div class="connection-indicator" id="connectionIndicator"></div>
        <span class="ml-2 text-sm font-medium text-gray-700" id="connectionStatus">Connecting to server...</span>
    </div>
</div>

<!-- Stats Grid -->
<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
    <!-- Total Bots -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Bots</dt>
                        <dd class="text-lg font-medium text-gray-900" id="totalBots">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">All configured bots</div>
        </div>
    </div>

    <!-- Active Bots -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg">
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
                        <dt class="text-sm font-medium text-gray-500 truncate">Active Bots</dt>
                        <dd class="text-lg font-medium text-gray-900" id="activeBots">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Currently running</div>
        </div>
    </div>

    <!-- Total Users -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
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
            <div class="text-sm text-gray-500">Connected users</div>
        </div>
    </div>

    <!-- Total Rooms -->
    <div class="stats-card bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                    </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Rooms</dt>
                        <dd class="text-lg font-medium text-gray-900" id="totalRooms">-</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm text-gray-500">Available rooms</div>
        </div>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Left Column - Bot List -->
    <div class="lg:col-span-2">
        <!-- Global Controls -->
        <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Global Bot Controls</h3>
                <p class="mt-1 text-sm text-gray-500">Manage all bots at once with these controls.</p>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <div class="flex flex-wrap gap-3">
                    <button type="button" onclick="startAllBots()" 
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V5z"></path>
                        </svg>
                        Start All Bots
                    </button>
                    <button type="button" onclick="pauseAllBots()" 
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                        <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Pause All Bots
                    </button>
                    <button type="button" onclick="stopAllBots()" 
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"></path>
                        </svg>
                        Stop All Bots
                    </button>
                    <button type="button" onclick="restartAllBots()" 
                            class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Restart All Bots
                    </button>
                </div>
            </div>
        </div>

        <!-- Active Bots List -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
                <div class="md:flex md:items-center md:justify-between">
                    <div class="min-w-0 flex-1">
                        <h3 class="text-lg font-medium leading-6 text-gray-900">Active Bots</h3>
                        <p class="mt-1 text-sm text-gray-500">Currently running bots and their status.</p>
                    </div>
                    <div class="mt-4 md:ml-4 md:mt-0">
                        <span class="text-sm text-gray-500" id="botCount">0 bots</span>
                    </div>
                </div>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <div id="botList" class="space-y-4">
                    <div class="text-center py-8 text-gray-500">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <p class="mt-2">Loading bots...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Column - Controls & Logs -->
    <div class="lg:col-span-1">
        <!-- Bot System Configuration -->
        <div class="bg-white shadow rounded-lg mb-6">
            <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Bot System Configuration</h3>
                <p class="mt-1 text-sm text-gray-500">Configure and start the automated bot system with multiple personalities and distribution modes.</p>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <form id="createBotForm" class="space-y-4">
                    <div>
                        <label for="botCount" class="block text-sm font-medium text-gray-700">Number of Bots</label>
                        <input type="number" id="botCount" name="botCount" min="1" max="5000" value="10" required
                               class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                               placeholder="1-5000">
                        <p class="mt-1 text-xs text-gray-500">Maximum 5000 bots</p>
                    </div>
                    
                    <div>
                        <label for="distributionMode" class="block text-sm font-medium text-gray-700">Distribution Mode</label>
                        <select id="distributionMode" name="distributionMode" required
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="random">Random - Distribute across all public rooms</option>
                            <option value="single_room">Single Room - All bots in one room</option>
                            <option value="weighted">Weighted - Based on room popularity</option>
                            <option value="balanced">Balanced - Even distribution</option>
                        </select>
                    </div>
                    
                    <div id="targetRoomSection" style="display: none;">
                        <label for="targetRoomId" class="block text-sm font-medium text-gray-700">Target Room ID</label>
                        <input type="number" id="targetRoomId" name="targetRoomId"
                               class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                               placeholder="Room ID for single room mode">
                    </div>
                    
                    <div>
                        <label for="chatFrequency" class="block text-sm font-medium text-gray-700">Chat Frequency (ms)</label>
                        <input type="number" id="chatFrequency" name="chatFrequencyMs" min="500" max="300000" value="1500" required
                               class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <p class="mt-1 text-xs text-gray-500">500ms - 300000ms (5 minutes)</p>
                    </div>
                    
                    <div>
                        <label for="moveFrequency" class="block text-sm font-medium text-gray-700">Move Frequency (ms)</label>
                        <input type="number" id="moveFrequency" name="moveFrequencyMs" min="60000" max="1800000" value="300000" required
                               class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <p class="mt-1 text-xs text-gray-500">60000ms (1 min) - 1800000ms (30 mins)</p>
                    </div>
                    
                    <div class="border-t pt-4">
                        <h4 class="text-sm font-medium text-gray-900 mb-2">Bot Personalities Distribution</h4>
                        <div class="text-xs text-gray-600 space-y-1">
                            <div><strong>Chatty (25%):</strong> Initiates conversations frequently</div>
                            <div><strong>Responsive (25%):</strong> Mainly responds to others</div>
                            <div><strong>Social (15%):</strong> Asks questions and engages groups</div>
                            <div><strong>Casual (15%):</strong> Makes light, casual comments</div>
                            <div><strong>Friendly (15%):</strong> Welcoming and positive</div>
                            <div><strong>Lurker (5%):</strong> Rarely talks, mostly observes</div>
                        </div>
                    </div>
                    
                    <button type="submit" 
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Start Bot System
                    </button>
                </form>
            </div>
        </div>

        <!-- System Logs -->
        <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
                <div class="md:flex md:items-center md:justify-between">
                    <div class="min-w-0 flex-1">
                        <h3 class="text-lg font-medium leading-6 text-gray-900">System Logs</h3>
                        <p class="mt-1 text-sm text-gray-500">Real-time bot activity logs.</p>
                    </div>
                    <div class="mt-4 md:ml-4 md:mt-0">
                        <button type="button" onclick="clearLogs()" 
                                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Clear
                        </button>
                    </div>
                </div>
            </div>
            <div class="px-4 py-5 sm:p-6">
                <div id="systemLogs" class="logs-container">
                    <div class="log-entry info">System initialized</div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
// Ensure admin token is available (set by parent layout)
if (!window.adminToken) {
    console.warn('⚠️ No admin token found, using fallback');
    window.adminToken = localStorage.getItem('admin_token') || 'admin-dev-token';
}

// Debug: log the token being used
console.log('🔑 Using admin token:', window.adminToken ? window.adminToken.substring(0, 10) + '...' : 'none');

const adminToken = window.adminToken;

// WebSocket connection for real-time updates
let botSocket = null;
let isConnected = false;

// Initialize Socket.IO connection when available
function initBotSocket() {
    if (typeof io !== 'undefined' && window.CHAT_SERVER_URL) {
        try {
            botSocket = io(window.CHAT_SERVER_URL);
            
            botSocket.on('connect', () => {
                isConnected = true;
                updateConnectionStatus(true);
                addLog('Connected to bot server', 'info');
            });

            botSocket.on('disconnect', () => {
                isConnected = false;
                updateConnectionStatus(false);
                addLog('Disconnected from bot server', 'error');
            });

            botSocket.on('bot_update', (data) => {
                updateBotInList(data);
            });

            botSocket.on('bot_log', (data) => {
                addLog(`[${data.botName}] ${data.message}`, data.level || 'info');
            });
        } catch (error) {
            console.warn('Failed to initialize bot Socket.IO connection:', error);
            addLog('Socket.IO connection failed - using API only', 'warning');
        }
    } else {
        console.log('Socket.IO not available - bot management will use API only');
        addLog('Real-time features disabled - using API only', 'warning');
    }
}

// Initialize when DOM is ready
setTimeout(initBotSocket, 1000);

// Update connection status
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionIndicator');
    const status = document.getElementById('connectionStatus');
    
    if (connected) {
        indicator.classList.add('connected');
        status.textContent = 'Connected to server';
    } else {
        indicator.classList.remove('connected');
        status.textContent = 'Disconnected from server';
    }
}

// Load bot statistics and list
async function loadBots() {
    try {
        console.log('🔄 Loading bot stats from /api/admin/bots/stats');
        
        const response = await fetch('/api/admin/bots/stats', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const responseText = await response.text();
            console.error('❌ Response text:', responseText);
            
            if (responseText.includes('<!DOCTYPE html>')) {
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
            }
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        const data = await response.json();
        console.log('✅ Bot data received:', data);
        
        // Handle the Laravel API response structure
        if (data.success && data.data) {
            updateStatistics({
                total: data.data.totalBots || 0,
                active: data.data.isRunning ? data.data.totalBots : 0,
                users: 0, // Will be filled by separate call if needed
                rooms: Object.keys(data.data.botsPerRoom || {}).length
            });
            updateBotList(data.data.botDetails || []);
        } else {
            throw new Error(data.error || 'Invalid response format');
        }
        
    } catch (error) {
        console.error('❌ Failed to load bots:', error);
        addLog(`Failed to load bots: ${error.message}`, 'error');
        
        // Set default values on error
        updateStatistics({ total: 0, active: 0, users: 0, rooms: 0 });
        updateBotList([]);
    }
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('totalBots').textContent = stats.total || 0;
    document.getElementById('activeBots').textContent = stats.active || 0;
    document.getElementById('totalUsers').textContent = stats.users || 0;
    document.getElementById('totalRooms').textContent = stats.rooms || 0;
}

// Update bot list display
function updateBotList(bots) {
    const botList = document.getElementById('botList');
    const botCount = document.getElementById('botCount');
    
    if (!bots || bots.length === 0) {
        botList.innerHTML = '<div class="text-center text-gray-400 py-8">No bots found</div>';
        botCount.textContent = '0 bots';
        return;
    }
    
    botCount.textContent = `${bots.length} bot${bots.length !== 1 ? 's' : ''}`;
    
    botList.innerHTML = bots.map(bot => createBotItem(bot)).join('');
}

// Create bot item HTML
function createBotItem(bot) {
    const statusClass = bot.status.toLowerCase();
    const uptime = bot.uptime ? formatUptime(bot.uptime) : 'N/A';
    
    return `
        <div class="bot-item" data-bot-id="${bot.id}">
            <div class="bot-header">
                <div class="bot-name">${escapeHtml(bot.name)}</div>
                <span class="bot-status ${statusClass}">${bot.status}</span>
            </div>
            <div class="bot-info">
                <div class="bot-info-item">
                    <span class="bot-info-label">Room</span>
                    <span class="bot-info-value">${escapeHtml(bot.room || bot.currentRoomName || 'N/A')}</span>
                </div>
                <div class="bot-info-item">
                    <span class="bot-info-label">Personality</span>
                    <span class="bot-info-value">${escapeHtml(bot.chatPersonality || bot.personality || 'Unknown')}</span>
                </div>
                <div class="bot-info-item">
                    <span class="bot-info-label">Text Style</span>
                    <span class="bot-info-value">${escapeHtml(bot.textStyle || 'Regular')}</span>
                </div>
                <div class="bot-info-item">
                    <span class="bot-info-label">Distribution</span>
                    <span class="bot-info-value">${escapeHtml(bot.distributionMode || 'N/A')}</span>
                </div>
                <div class="bot-info-item">
                    <span class="bot-info-label">Uptime</span>
                    <span class="bot-info-value">${uptime}</span>
                </div>
                <div class="bot-info-item">
                    <span class="bot-info-label">UID</span>
                    <span class="bot-info-value">${bot.uid || bot.id}</span>
                </div>
            </div>
            <div class="bot-controls">
                ${bot.status === 'offline' ? 
                    `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500" onclick="startBot('${bot.id}')">Start</button>` :
                    `<button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500" onclick="pauseBot('${bot.id}')">Pause</button>
                     <button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onclick="stopBot('${bot.id}')">Stop</button>`
                }
                <button class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="restartBot('${bot.id}')">Restart</button>
                <button class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="viewBotLogs('${bot.id}')">Logs</button>
                <button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onclick="deleteBot('${bot.id}')">Delete</button>
            </div>
        </div>
    `;
}

// Bot control functions
async function startBot(botId) {
    await sendBotCommand('start', botId);
}

async function stopBot(botId) {
    await sendBotCommand('stop', botId);
}

async function pauseBot(botId) {
    await sendBotCommand('pause', botId);
}

async function restartBot(botId) {
    await sendBotCommand('restart', botId);
}

async function deleteBot(botId) {
    if (!confirm('Are you sure you want to delete this bot?')) {
        return;
    }
    await sendBotCommand('delete', botId);
}

// Global bot control functions
async function startAllBots() {
    await sendBotCommand('start_all');
}

async function stopAllBots() {
    await sendBotCommand('stop_all');
}

async function pauseAllBots() {
    await sendBotCommand('pause_all');
}

async function restartAllBots() {
    await sendBotCommand('restart_all');
}

// Send bot command
async function sendBotCommand(action, botId = null) {
    try {
        const url = botId ? `/api/admin/bots/${botId}/${action}` : `/api/admin/bots/${action}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        addLog(result.message || `Command ${action} executed`, 'info');
        
        // Refresh bot list after command
        setTimeout(loadBots, 1000);
        
    } catch (error) {
        console.error(`Failed to execute ${action}:`, error);
        addLog(`Failed to execute ${action}: ${error.message}`, 'error');
    }
}

// Handle distribution mode change
document.getElementById('distributionMode').addEventListener('change', function() {
    const targetRoomSection = document.getElementById('targetRoomSection');
    const targetRoomInput = document.getElementById('targetRoomId');
    
    if (this.value === 'single_room') {
        targetRoomSection.style.display = 'block';
        targetRoomInput.required = true;
    } else {
        targetRoomSection.style.display = 'none';
        targetRoomInput.required = false;
        targetRoomInput.value = '';
    }
});

// Start bot system
document.getElementById('createBotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        botCount: parseInt(document.getElementById('botCount').value),
        distributionMode: document.getElementById('distributionMode').value,
        chatFrequencyMs: parseInt(document.getElementById('chatFrequency').value),
        moveFrequencyMs: parseInt(document.getElementById('moveFrequency').value)
    };
    
    // Add target room ID if in single room mode
    if (formData.distributionMode === 'single_room') {
        const targetRoomId = document.getElementById('targetRoomId').value;
        if (targetRoomId) {
            formData.targetRoomId = parseInt(targetRoomId);
        }
    }
    
    try {
        console.log('🚀 Starting bot system with config:', formData);
        
        const response = await fetch('/api/admin/bots/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        console.log('📡 Start bots response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const responseText = await response.text();
            console.error('❌ Start bots response text:', responseText);
            
            if (responseText.includes('<!DOCTYPE html>')) {
                throw new Error(`Server returned HTML instead of JSON. Check if Laravel API is running properly. Status: ${response.status}`);
            }
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
        const result = await response.json();
        console.log('✅ Bot system start result:', result);
        
        if (result.success) {
            addLog(`Bot system started: ${result.message}`, 'info');
        } else {
            throw new Error(result.error || result.message || 'Unknown error');
        }
        
        // Reset form
        document.getElementById('createBotForm').reset();
        document.getElementById('targetRoomSection').style.display = 'none';
        
        // Refresh bot list
        loadBots();
        
    } catch (error) {
        console.error('Failed to start bot system:', error);
        addLog(`Failed to start bot system: ${error.message}`, 'error');
    }
});

// View bot logs
function viewBotLogs(botId) {
    // This could open a modal or navigate to a detailed logs page
    window.open(`/admin/bots/${botId}/logs`, '_blank');
}

// Add log entry
function addLog(message, level = 'info') {
    const logsContainer = document.getElementById('systemLogs');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${level}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    // Keep only last 100 log entries
    const entries = logsContainer.querySelectorAll('.log-entry');
    if (entries.length > 100) {
        entries[0].remove();
    }
}

// Clear logs
function clearLogs() {
    document.getElementById('systemLogs').innerHTML = '';
    addLog('Logs cleared', 'info');
}

// Update individual bot in list
function updateBotInList(botData) {
    const botItem = document.querySelector(`[data-bot-id="${botData.id}"]`);
    if (botItem) {
        botItem.outerHTML = createBotItem(botData);
    } else {
        // Bot not in list, refresh entire list
        loadBots();
    }
}

// Refresh bots
async function refreshBots() {
    addLog('Refreshing bot list...', 'info');
    await loadBots();
}

// Format uptime
function formatUptime(seconds) {
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

// Escape HTML to prevent XSS
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

// Load bots when page loads
document.addEventListener('DOMContentLoaded', loadBots);

// Auto-refresh every 10 seconds
setInterval(loadBots, 10000);
</script>
@endsection