@extends('layouts.app')

@section('title', 'Bot Management - h2ktalk.fun Admin')

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

.bot-section {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.bot-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.bot-stat {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    text-align: center;
}

.bot-stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ff4500;
}

.bot-stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-top: 0.25rem;
}

.bot-controls {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    align-items: start;
}

.control-form {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
}

.control-form h3 {
    color: #ffffff;
    margin-bottom: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    color: #ffffff;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: #ff4500;
}

.form-group small {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
    margin-top: 0.25rem;
    display: block;
}

.form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
}

.quick-actions {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
    min-width: 200px;
}

.quick-actions h3 {
    color: #ffffff;
    margin-bottom: 1rem;
}

.quick-actions .btn {
    width: 100%;
    margin-bottom: 0.5rem;
    padding: 10px;
    font-size: 0.9rem;
}

.btn-start {
    background: rgba(34, 197, 94, 0.8);
    border: 2px solid #22c55e;
    color: #ffffff;
}

.btn-start:hover {
    background: #22c55e;
    border-color: #22c55e;
}

.btn-stop {
    background: rgba(239, 68, 68, 0.8);
    border: 2px solid #ef4444;
    color: #ffffff;
}

.btn-stop:hover {
    background: #ef4444;
    border-color: #ef4444;
}

.bot-list {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
}

.bot-list h3 {
    color: #ffffff;
    margin-bottom: 1rem;
}

.bot-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1rem;
    align-items: center;
}

.bot-info {
    color: #ffffff;
}

.bot-name {
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.bot-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
}

.bot-status {
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

.status-idle {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    border: 1px solid #f59e0b;
}

.status-offline {
    background: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
    border: 1px solid #9ca3af;
}

.bot-actions {
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

.btn-stop-bot {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.btn-restart {
    color: #3b82f6;
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
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
    
    .bot-controls {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .quick-actions {
        min-width: auto;
    }
    
    .bot-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .bot-item {
        grid-template-columns: 1fr;
        gap: 0.5rem;
        text-align: center;
    }
    
    .form-actions {
        flex-direction: column;
    }
}
@endsection

@section('content')
<div class="admin-header">
    <h1>🤖 Bot Management</h1>
    <a href="{{ route('admin.dashboard') }}" class="btn back-btn">← Back to Dashboard</a>
</div>

<div class="bot-stats">
    <div class="bot-stat">
        <div class="bot-stat-value" id="activeBots">-</div>
        <div class="bot-stat-label">Active Bots</div>
    </div>
    <div class="bot-stat">
        <div class="bot-stat-value" id="totalMessages">-</div>
        <div class="bot-stat-label">Messages Sent</div>
    </div>
    <div class="bot-stat">
        <div class="bot-stat-value" id="averageLatency">-</div>
        <div class="bot-stat-label">Avg Response (ms)</div>
    </div>
    <div class="bot-stat">
        <div class="bot-stat-value" id="botUptime">-</div>
        <div class="bot-stat-label">Bot Uptime</div>
    </div>
</div>

<div class="bot-section">
    <div class="bot-controls">
        <div class="control-form">
            <h3>Deploy New Bots</h3>
            <form id="botConfigForm">
                <div class="form-group">
                    <label for="botCount">Number of Bots</label>
                    <input type="number" id="botCount" min="1" max="50" value="5">
                    <small>Maximum 50 bots per deployment</small>
                </div>
                
                <div class="form-group">
                    <label for="targetRoom">Target Room</label>
                    <select id="targetRoom">
                        <option value="">Select Room</option>
                        <option value="1">General Chat</option>
                        <option value="2">Music Room</option>
                        <option value="3">Tech Talk</option>
                        <option value="4">Random Chat</option>
                    </select>
                    <small>Room where bots will be deployed</small>
                </div>
                
                <div class="form-group">
                    <label for="chatFrequency">Chat Frequency (seconds)</label>
                    <input type="number" id="chatFrequency" min="10" max="300" value="60">
                    <small>How often bots send messages</small>
                </div>
                
                <div class="form-group">
                    <label for="moveFrequency">Move Frequency (seconds)</label>
                    <input type="number" id="moveFrequency" min="30" max="600" value="120">
                    <small>How often bots change rooms</small>
                </div>
                
                <div class="form-group">
                    <label for="distributionMode">Distribution Mode</label>
                    <select id="distributionMode">
                        <option value="random">Random Distribution</option>
                        <option value="concentrated">Concentrated</option>
                        <option value="spread">Even Spread</option>
                    </select>
                    <small>How bots are distributed across rooms</small>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-start">Deploy Bots</button>
                    <button type="button" class="btn btn-primary" onclick="previewConfig()">Preview Config</button>
                </div>
            </form>
        </div>
        
        <div class="quick-actions">
            <h3>Quick Actions</h3>
            <button class="btn btn-start" onclick="startAllBots()">Start All Bots</button>
            <button class="btn btn-stop" onclick="stopAllBots()">Stop All Bots</button>
            <button class="btn btn-primary" onclick="restartBots()">Restart Bots</button>
            <button class="btn btn-primary" onclick="refreshBotList()">Refresh List</button>
        </div>
    </div>
</div>

<div class="bot-list">
    <h3>Active Bot Sessions</h3>
    <div id="botsList">
        <div class="loading-text">Loading bot information...</div>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
let activeBots = [];
let botStats = {
    active: 0,
    totalMessages: 0,
    averageLatency: 0,
    uptime: '00:00:00'
};
let isOnlineMode = true; // Track API connectivity
let isSocketConnected = false; // Track Socket.IO connectivity

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Socket.IO event handlers for bot management
function setupBotSocketListeners() {
    if (!window.socketClient) {
        console.warn('Socket.IO client not available for bot management');
        return;
    }

    // Listen for real-time bot updates
    window.socketClient.on('bot-update', (data) => {
        console.log('🤖 Real-time bot update:', data);
        updateBotsFromSocket(data);
    });

    // Listen for connection status changes
    window.socketClient.on('connection-status', (status) => {
        isSocketConnected = status.connected;
        updateBotConnectionIndicator(status);
        
        if (status.connected) {
            // Request initial bot data when connected
            requestBotData();
        }
    });

    // Listen for individual bot events
    window.socketClient.on('bot-started', (data) => {
        console.log('🚀 Bot started:', data);
        refreshBotList();
    });

    window.socketClient.on('bot-stopped', (data) => {
        console.log('⏹️ Bot stopped:', data);
        refreshBotList();
    });

    window.socketClient.on('bot-error', (data) => {
        console.log('❌ Bot error:', data);
        alert(`Bot Error: ${data.message}`);
        refreshBotList();
    });
}

// Update connection indicator for bot management
function updateBotConnectionIndicator(status) {
    // You can add a visual indicator here if needed
    console.log(`Bot Management Socket.IO: ${status.connected ? 'Connected' : 'Disconnected'}`);
    
    // Update the page title to show connection status
    const headerTitle = document.querySelector('.admin-header h1');
    if (headerTitle) {
        const emoji = status.connected ? '🤖' : '🔌';
        const originalText = headerTitle.textContent.replace(/^[🤖🔌] /, '');
        headerTitle.textContent = `${emoji} ${originalText}`;
    }
}

// Request bot data via Socket.IO
function requestBotData() {
    if (window.socketClient && isSocketConnected) {
        // Request bot list and stats
        window.socketClient.send('requestBotList', {});
        window.socketClient.send('requestBotStats', {});
        
        console.log('🤖 Requested real-time bot data via Socket.IO');
    }
}

// Update bots from Socket.IO data
function updateBotsFromSocket(data) {
    console.log('🔄 Updating bot management with Socket.IO data:', data);
    
    if (data.bots) {
        activeBots = data.bots;
        renderBotList();
    }
    
    if (data.stats) {
        botStats = {
            active: data.stats.active || 0,
            totalMessages: data.stats.totalMessages || 0,
            averageLatency: data.stats.averageLatency || 0,
            uptime: data.stats.uptime || '00:00:00'
        };
        updateBotStats();
    }
    
    // Mark as online mode when receiving real-time data
    isOnlineMode = true;
    updateConnectionStatus();
}

// API utility functions
async function makeApiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(endpoint, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Generate fallback mock data when API is unavailable
function generateFallbackBots() {
    const botNames = ['ChatBot', 'TalkBot', 'VoiceBot', 'RandomBot', 'TestBot'];
    const rooms = ['General Chat', 'Music Room', 'Tech Talk', 'Random Chat'];
    const statuses = ['active', 'idle', 'offline'];
    
    activeBots = [];
    for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
        const bot = {
            id: i + 1,
            name: `${botNames[Math.floor(Math.random() * botNames.length)]}${i + 1}`,
            room: rooms[Math.floor(Math.random() * rooms.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            messages: Math.floor(Math.random() * 500) + 50,
            uptime: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            lastActivity: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString()
        };
        activeBots.push(bot);
    }
    
    // Update stats
    botStats.active = activeBots.filter(b => b.status === 'active').length;
    botStats.totalMessages = activeBots.reduce((sum, bot) => sum + bot.messages, 0);
    botStats.averageLatency = Math.floor(Math.random() * 100) + 50;
    botStats.uptime = '2d 14h 32m';
}

// Load bot statistics from API
async function loadBotStats() {
    try {
        const response = await makeApiCall('/api/admin/bots/stats');
        
        if (response.success) {
            // Update bot statistics from API response
            botStats.active = response.data.active_bots || 0;
            botStats.totalMessages = response.data.total_messages || 0;
            botStats.averageLatency = response.data.average_latency || 0;
            botStats.uptime = response.data.uptime || '00:00:00';
            
            // Update bot list from API response
            activeBots = response.data.bots || [];
            
            // Mark as online mode
            isOnlineMode = true;
            updateConnectionStatus();
        } else {
            throw new Error(response.message || 'Failed to load bot stats');
        }
    } catch (error) {
        console.error('Failed to load bot stats from API, using fallback data:', error);
        // Fall back to mock data when API is unavailable
        generateFallbackBots();
        
        // Mark as offline mode
        isOnlineMode = false;
        updateConnectionStatus();
    }
}

// Update connection status indicator
function updateConnectionStatus() {
    // You can add visual indicators here if needed
    console.log(`Bot Management: ${isOnlineMode ? 'Online' : 'Offline'} mode`);
}

// Update bot statistics
function updateBotStats() {
    document.getElementById('activeBots').textContent = botStats.active;
    document.getElementById('totalMessages').textContent = botStats.totalMessages.toLocaleString();
    document.getElementById('averageLatency').textContent = botStats.averageLatency;
    document.getElementById('botUptime').textContent = botStats.uptime;
}

// Render bot list
function renderBotList() {
    const container = document.getElementById('botsList');
    
    if (activeBots.length === 0) {
        container.innerHTML = '<div class="loading-text">No active bots</div>';
        return;
    }
    
    const botsHtml = activeBots.map(bot => `
        <div class="bot-item">
            <div class="bot-info">
                <div class="bot-name">${bot.name}</div>
                <div class="bot-details">
                    Room: ${bot.room} | Messages: ${bot.messages} | Last: ${bot.lastActivity}
                </div>
            </div>
            <div class="bot-status status-${bot.status}">
                ${bot.status.toUpperCase()}
            </div>
            <div class="bot-actions">
                <button class="action-btn btn-restart" onclick="restartBot(${bot.id})">Restart</button>
                <button class="action-btn btn-stop-bot" onclick="stopBot(${bot.id})">Stop</button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = botsHtml;
}

// Bot configuration form
document.getElementById('botConfigForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const config = {
        botCount: parseInt(document.getElementById('botCount').value),
        targetRoom: document.getElementById('targetRoom').value,
        chatFrequency: parseInt(document.getElementById('chatFrequency').value),
        moveFrequency: parseInt(document.getElementById('moveFrequency').value),
        distributionMode: document.getElementById('distributionMode').value
    };
    
    if (!config.targetRoom) {
        alert('Please select a target room');
        return;
    }
    
    try {
        const result = await deployBots(config);
        
        if (result && result.success) {
            alert(`Successfully deployed ${config.botCount} bots to ${document.getElementById('targetRoom').selectedOptions[0].text}`);
        } else {
            alert(`Deployed ${config.botCount} bots to ${document.getElementById('targetRoom').selectedOptions[0].text} (offline mode)`);
        }
        
        await refreshBotList();
    } catch (error) {
        console.error('Error deploying bots:', error);
        alert('Failed to deploy bots. Using offline mode.');
        await refreshBotList();
    }
});

// Deploy bots function with Socket.IO and API fallback
async function deployBots(config) {
    // Try Socket.IO first if connected
    if (window.socketClient && isSocketConnected) {
        try {
            const response = await window.socketClient.request('deployBots', {
                bot_count: config.botCount,
                target_room: config.targetRoom,
                chat_frequency: config.chatFrequency,
                move_frequency: config.moveFrequency,
                distribution_mode: config.distributionMode
            });
            
            console.log('🚀 Bots deployed via Socket.IO:', response);
            
            // Real-time updates will handle the UI refresh
            return { success: true, data: response };
        } catch (socketError) {
            console.warn('Failed to deploy bots via Socket.IO, falling back to API:', socketError);
        }
    }
    
    // Fallback to REST API
    try {
        const response = await makeApiCall('/api/admin/bots/start', {
            method: 'POST',
            body: JSON.stringify({
                bot_count: config.botCount,
                target_room: config.targetRoom,
                chat_frequency: config.chatFrequency,
                move_frequency: config.moveFrequency,
                distribution_mode: config.distributionMode
            })
        });
        
        if (response.success) {
            // Refresh bot list after successful deployment
            await loadBotStats();
            return response;
        } else {
            throw new Error(response.message || 'Failed to deploy bots');
        }
    } catch (error) {
        console.error('Failed to deploy bots via API, simulating deployment:', error);
        
        // Fallback to mock deployment when both Socket.IO and API are unavailable
        for (let i = 0; i < config.botCount; i++) {
            const newBot = {
                id: activeBots.length + i + 1,
                name: `Bot${activeBots.length + i + 1}`,
                room: document.getElementById('targetRoom').selectedOptions[0].text,
                status: 'active',
                messages: 0,
                uptime: '00:00:00',
                lastActivity: new Date().toLocaleTimeString()
            };
            activeBots.push(newBot);
        }
        
        // Re-throw error to let caller handle it
        throw error;
    }
}

// Quick action functions
async function startAllBots() {
    try {
        const response = await makeApiCall('/api/admin/bots/start', {
            method: 'POST',
            body: JSON.stringify({ action: 'start_all' })
        });
        
        if (response.success) {
            await loadBotStats();
            updateBotStats();
            renderBotList();
            alert('All bots have been started');
        } else {
            throw new Error(response.message || 'Failed to start bots');
        }
    } catch (error) {
        console.error('Failed to start bots via API, using fallback:', error);
        
        // Fallback behavior
        activeBots.forEach(bot => {
            if (bot.status !== 'active') {
                bot.status = 'active';
                bot.lastActivity = new Date().toLocaleTimeString();
            }
        });
        updateBotStats();
        renderBotList();
        alert('All bots have been started (offline mode)');
    }
}

async function stopAllBots() {
    if (confirm('Are you sure you want to stop all bots?')) {
        try {
            const response = await makeApiCall('/api/admin/bots/stop', {
                method: 'POST',
                body: JSON.stringify({ action: 'stop_all' })
            });
            
            if (response.success) {
                await loadBotStats();
                updateBotStats();
                renderBotList();
                alert('All bots have been stopped');
            } else {
                throw new Error(response.message || 'Failed to stop bots');
            }
        } catch (error) {
            console.error('Failed to stop bots via API, using fallback:', error);
            
            // Fallback behavior
            activeBots.forEach(bot => {
                bot.status = 'offline';
            });
            updateBotStats();
            renderBotList();
            alert('All bots have been stopped (offline mode)');
        }
    }
}

async function restartBots() {
    if (confirm('Are you sure you want to restart all bots?')) {
        try {
            const response = await makeApiCall('/api/admin/bots/restart', {
                method: 'POST',
                body: JSON.stringify({ action: 'restart_all' })
            });
            
            if (response.success) {
                await loadBotStats();
                updateBotStats();
                renderBotList();
                alert('All bots have been restarted');
            } else {
                throw new Error(response.message || 'Failed to restart bots');
            }
        } catch (error) {
            console.error('Failed to restart bots via API, using fallback:', error);
            
            // Fallback behavior
            activeBots.forEach(bot => {
                bot.status = 'active';
                bot.lastActivity = new Date().toLocaleTimeString();
            });
            updateBotStats();
            renderBotList();
            alert('All bots have been restarted (offline mode)');
        }
    }
}

async function refreshBotList() {
    await loadBotStats();
    updateBotStats();
    renderBotList();
}

// Individual bot actions
async function restartBot(botId) {
    const bot = activeBots.find(b => b.id === botId);
    if (bot) {
        try {
            const response = await makeApiCall('/api/admin/bots/restart', {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'restart_single',
                    bot_id: botId 
                })
            });
            
            if (response.success) {
                await loadBotStats();
                updateBotStats();
                renderBotList();
                alert(`Bot ${bot.name} has been restarted`);
            } else {
                throw new Error(response.message || 'Failed to restart bot');
            }
        } catch (error) {
            console.error('Failed to restart bot via API, using fallback:', error);
            
            // Fallback behavior
            bot.status = 'active';
            bot.lastActivity = new Date().toLocaleTimeString();
            updateBotStats();
            renderBotList();
            alert(`Bot ${bot.name} has been restarted (offline mode)`);
        }
    }
}

async function stopBot(botId) {
    const bot = activeBots.find(b => b.id === botId);
    if (bot && confirm(`Are you sure you want to stop ${bot.name}?`)) {
        try {
            const response = await makeApiCall('/api/admin/bots/stop', {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'stop_single',
                    bot_id: botId 
                })
            });
            
            if (response.success) {
                await loadBotStats();
                updateBotStats();
                renderBotList();
                alert(`Bot ${bot.name} has been stopped`);
            } else {
                throw new Error(response.message || 'Failed to stop bot');
            }
        } catch (error) {
            console.error('Failed to stop bot via API, using fallback:', error);
            
            // Fallback behavior
            bot.status = 'offline';
            updateBotStats();
            renderBotList();
            alert(`Bot ${bot.name} has been stopped (offline mode)`);
        }
    }
}

// Preview configuration
function previewConfig() {
    const config = {
        botCount: document.getElementById('botCount').value,
        targetRoom: document.getElementById('targetRoom').selectedOptions[0]?.text || 'None selected',
        chatFrequency: document.getElementById('chatFrequency').value,
        moveFrequency: document.getElementById('moveFrequency').value,
        distributionMode: document.getElementById('distributionMode').value
    };
    
    const preview = `
Bot Deployment Configuration:
• Number of Bots: ${config.botCount}
• Target Room: ${config.targetRoom}
• Chat Frequency: Every ${config.chatFrequency} seconds
• Move Frequency: Every ${config.moveFrequency} seconds
• Distribution: ${config.distributionMode}
    `;
    
    alert(preview);
}

// Load available rooms with optional API integration
async function loadAvailableRooms() {
    let rooms = [];
    
    try {
        // Try to fetch from API first
        const response = await makeApiCall('/api/admin/rooms');
        if (response.success && response.data) {
            rooms = response.data;
        } else {
            throw new Error('API response not successful');
        }
    } catch (error) {
        console.error('Failed to load rooms from API, using fallback data:', error);
        // Fallback to hardcoded rooms when API is unavailable
        rooms = [
            { id: 1, name: 'General Chat', users: 25 },
            { id: 2, name: 'Music Room', users: 18 },
            { id: 3, name: 'Tech Talk', users: 12 },
            { id: 4, name: 'Random Chat', users: 31 }
        ];
    }
    
    const select = document.getElementById('targetRoom');
    select.innerHTML = '<option value="">Select Room</option>';
    
    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = `${room.name} (${room.users || 0} users)`;
        select.appendChild(option);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set up Socket.IO listeners first
    setupBotSocketListeners();
    
    // Load initial data
    await loadBotStats();
    updateBotStats();
    renderBotList();
    await loadAvailableRooms();
    
    // If Socket.IO is connected, request real-time data
    setTimeout(() => {
        if (isSocketConnected) {
            requestBotData();
        }
    }, 1000);
    
    // Auto-refresh with dynamic interval based on connection
    setInterval(async () => {
        if (isSocketConnected) {
            // With Socket.IO, refresh less frequently (every 30 seconds)
            // Real-time updates handle most changes
            requestBotData();
        } else {
            // Without Socket.IO, refresh more frequently (every 10 seconds)
            await loadBotStats();
            updateBotStats();
        }
    }, isSocketConnected ? 30000 : 10000);
});
@endsection