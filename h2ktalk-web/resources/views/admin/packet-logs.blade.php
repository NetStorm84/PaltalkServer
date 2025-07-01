@extends('layouts.app')

@section('title', 'Packet Logs - h2ktalk.fun Admin')

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

.logs-section {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
}

.logs-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.logs-controls h2 {
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

.btn-danger {
    background: rgba(220, 38, 38, 0.8);
    border: 2px solid #dc2626;
    color: #ffffff;
}

.btn-danger:hover {
    background: #dc2626;
    border-color: #dc2626;
}

.btn-export {
    background: rgba(34, 197, 94, 0.8);
    border: 2px solid #22c55e;
    color: #ffffff;
}

.btn-export:hover {
    background: #22c55e;
    border-color: #22c55e;
}

.logs-container {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    max-height: 500px;
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

.log-entry.incoming {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
}

.log-entry.outgoing {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.log-timestamp {
    color: #888;
    font-size: 0.8rem;
}

.log-direction {
    font-weight: bold;
    margin-right: 0.5rem;
}

.log-direction.incoming {
    color: #3b82f6;
}

.log-direction.outgoing {
    color: #ef4444;
}

.log-data {
    color: #ffffff;
    word-wrap: break-word;
    margin-top: 0.25rem;
}

.log-hex {
    color: #888;
    font-size: 0.8rem;
    margin-top: 0.25rem;
}

/* Direction badges */
.direction-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.direction-badge.incoming {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.direction-badge.outgoing {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.packet-type-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.5rem;
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 500;
    font-family: 'Courier New', monospace;
}

.packet-size-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.4rem;
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 500;
}

/* Enhanced packet details styles */
.packet-details {
    display: none;
    background: rgba(0, 0, 0, 0.4);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
    margin-top: 0.5rem;
}

.packet-details.show {
    display: block;
}

.packet-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.detail-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.75rem;
}

.detail-section h4 {
    color: #3b82f6;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.detail-field {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
}

.detail-field .label {
    color: #94a3b8;
}

.detail-field .value {
    color: #f8fafc;
    font-weight: 500;
}

.payload-section {
    grid-column: 1 / -1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.75rem;
}

.payload-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.payload-tab {
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.2s ease;
}

.payload-tab.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.payload-content {
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 0.5rem;
    font-family: 'Courier New', monospace;
    font-size: 0.7rem;
    max-height: 200px;
    overflow-y: auto;
    word-break: break-all;
    line-height: 1.3;
}

.hex-data { color: #fbbf24; }
.ascii-data { color: #34d399; }
.binary-data { color: #a78bfa; }
.decimal-data { color: #fb7185; }

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1rem;
    text-align: center;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ff4500;
}

.stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
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
    
    .logs-controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .control-group {
        justify-content: center;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
@endsection

@section('content')
<div class="admin-header">
    <h1 id="pageTitle">Packet Logs</h1>
    <a href="{{ route('admin.dashboard') }}" class="btn back-btn">← Back to Dashboard</a>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-value" id="totalPackets">-</div>
        <div class="stat-label">Total Packets</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="incomingPackets">-</div>
        <div class="stat-label">Incoming</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="outgoingPackets">-</div>
        <div class="stat-label">Outgoing</div>
    </div>
    <div class="stat-card">
        <div class="stat-value" id="recentPackets">-</div>
        <div class="stat-label">Last Hour</div>
    </div>
</div>

<div class="logs-section">
    <div class="logs-controls">
        <h2>Packet Capture</h2>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <div class="control-group">
                <label for="packetFilter" style="color: #ffffff; margin-right: 0.5rem;">Filter:</label>
                <select id="packetFilter">
                    <option value="all">All Packets</option>
                    <option value="incoming">Incoming Only</option>
                    <option value="outgoing">Outgoing Only</option>
                </select>
            </div>
            <div class="control-group">
                <label for="maxEntries" style="color: #ffffff; margin-right: 0.5rem;">Max:</label>
                <select id="maxEntries">
                    <option value="50">50</option>
                    <option value="100" selected>100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                </select>
            </div>
            <div class="control-group">
                <button class="btn btn-export" onclick="exportLogs()">Export</button>
                <button class="btn btn-danger" onclick="clearLogs()">Clear Logs</button>
            </div>
        </div>
    </div>
    
    <div id="logsContainer" class="logs-container">
        <div class="loading-text">📡 Connecting to chat server for packet monitoring...</div>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
let isCapturing = false;
let packetLogs = [];
let captureInterval = null;
let isSocketConnected = false;
let expandedPackets = new Set(); // Track expanded packet details

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Initialize Socket.IO connection for real-time packet streaming
function initializeSocketConnection() {
    // Connect to Node.js server via Laravel proxy for packet streaming
    const chatServerUrl = window.location.origin; // Use current domain (Laravel)
    
    try {
        if (typeof io !== 'undefined') {
            console.log('📡 Connecting to chat server for packet streaming...');
            window.packetSocket = io(chatServerUrl);
            
            window.packetSocket.on('connect', () => {
                console.log('✅ Connected to chat server for packet streaming');
                isSocketConnected = true;
                updatePacketConnectionIndicator({ connected: true });
                
                // Auto-start packet streaming
                startPacketMonitoring();
            });
            
            window.packetSocket.on('disconnect', () => {
                console.log('❌ Disconnected from chat server');
                isSocketConnected = false;
                updatePacketConnectionIndicator({ connected: false });
            });
            
            // Listen for real-time packet events
            window.packetSocket.on('packetLogged', (packetData) => {
                console.log('📦 Real-time packet received:', packetData);
                addPacketToLogsRealtime(packetData);
            });
            
            // Listen for bulk packet updates
            window.packetSocket.on('packets-batch', (data) => {
                console.log('📦 Packet batch received:', data);
                if (data.packets && Array.isArray(data.packets)) {
                    data.packets.forEach(packet => addPacketToLogsRealtime(packet));
                }
            });
            
            // Error handling
            window.packetSocket.on('connect_error', (error) => {
                console.warn('❌ Socket.IO connection error:', error.message);
                isSocketConnected = false;
                updatePacketConnectionIndicator({ connected: false });
                // Fall back to API polling
                console.log('🔄 Falling back to API polling for packet logs');
            });
            
        } else {
            console.warn('⚠️ Socket.IO library not available, using API polling only');
            isSocketConnected = false;
            updatePacketConnectionIndicator({ connected: false });
        }
    } catch (error) {
        console.error('❌ Failed to initialize Socket.IO connection:', error);
        isSocketConnected = false;
        updatePacketConnectionIndicator({ connected: false });
    }
}

// Socket.IO event handlers for packet logs (fallback)
function setupPacketSocketListeners() {
    if (!window.socketClient) {
        console.warn('Global Socket.IO client not available, using direct connection');
        return;
    }

    // Listen for real-time packet events
    window.socketClient.on('packetLogged', (packetData) => {
        console.log('📦 Real-time packet received via global socket:', packetData);
        addPacketToLogsRealtime(packetData);
    });

    // Listen for connection status changes
    window.socketClient.on('connection-status', (status) => {
        isSocketConnected = status.connected;
        updatePacketConnectionIndicator(status);
        
        if (status.connected && isCapturing) {
            requestPacketStream();
        }
    });
}

// Update connection indicator for packet logs
function updatePacketConnectionIndicator(status) {
    const headerTitle = document.getElementById('pageTitle');
    if (headerTitle) {
        const emoji = status.connected ? '📦' : '🔌';
        const baseText = 'Packet Logs';
        headerTitle.textContent = `${emoji} ${baseText}`;
    }
    
    // Log connection status for debugging
    console.log(`📊 Connection status updated: ${status.connected ? 'Connected' : 'Disconnected'}`);
}

// Request packet stream via Socket.IO
function requestPacketStream() {
    const socket = window.packetSocket || window.socketClient;
    
    if (socket && isSocketConnected) {
        // Request to start packet streaming with configuration
        const streamConfig = {
            filter: document.getElementById('packetFilter').value,
            maxEntries: parseInt(document.getElementById('maxEntries').value) || 100,
            includeHex: true,
            includeDetails: true
        };
        
        socket.emit('startPacketStream', streamConfig);
        console.log('📦 Requested real-time packet stream via Socket.IO:', streamConfig);
    } else {
        console.warn('⚠️ No Socket.IO connection available for packet streaming');
    }
}

// Stop packet stream via Socket.IO
function stopPacketStream() {
    const socket = window.packetSocket || window.socketClient;
    
    if (socket && isSocketConnected) {
        socket.emit('stopPacketStream', {});
        console.log('⏹️ Stopped real-time packet stream via Socket.IO');
    }
}

// Add packet to logs with real-time processing (Socket.IO)
function addPacketToLogsRealtime(packetData) {
    console.log('📦 Processing real-time packet:', packetData);
    
    // Process real packet data from Node.js server
    processRealTimePacket(packetData);
}

// Start packet monitoring automatically
function startPacketMonitoring() {
    isCapturing = true;
    
    if (isSocketConnected) {
        requestPacketStream();
        console.log('🚀 Auto-started real-time packet monitoring via Socket.IO');
    } else {
        // API polling fallback
        captureInterval = setInterval(fetchPacketLogs, 3000);
        fetchPacketLogs(); // Initial fetch
        console.log('🚀 Auto-started API polling for packet logs');
    }
}

// Stop packet monitoring (for cleanup)
function stopPacketMonitoring() {
    isCapturing = false;
    
    if (isSocketConnected) {
        stopPacketStream();
        console.log('⏹️ Stopped packet monitoring');
    }
    
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
        console.log('⏹️ Stopped API polling');
    }
}

// Fetch packet logs from API (real data only)
async function fetchPacketLogs() {
    try {
        const filter = document.getElementById('packetFilter').value;
        const maxEntries = parseInt(document.getElementById('maxEntries')?.value) || 100;
        
        const response = await fetch(`/api/admin/packet-logs?filter=${filter}&limit=${maxEntries}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success !== false && data.logs) {
            // Process real packet data from Node.js server
            const processedLogs = data.logs.map(packet => ({
                id: packet.id || `${Date.now()}-${Math.random()}`,
                timestamp: new Date(packet.timestamp),
                direction: packet.direction || 'unknown',
                type: packet.typeName || packet.type || 'UNKNOWN',
                size: packet.size || 0,
                data: packet.details?.payload?.hex || packet.data || '',
                summary: packet.summary || `${packet.typeName || packet.type} - ${packet.size} bytes`,
                details: packet.details || {},
                sequence: packet.sequence || 0
            }));
            
            packetLogs = processedLogs;
            updateStats();
            renderLogs();
        } else {
            console.warn('No packet data available from server');
            // Don't use simulation - show empty state
            packetLogs = [];
            updateStats();
            renderLogs();
        }
    } catch (error) {
        console.error('Error fetching packet logs:', error);
        // Don't simulate - show error state
        document.getElementById('logsContainer').innerHTML = 
            `<div class="loading-text" style="color: #ef4444;">❌ Unable to connect to chat server: ${error.message}</div>`;
    }
}

// Utility functions for data conversion
function hexToAscii(hex) {
    if (!hex) return '';
    // Remove spaces and convert hex pairs to ASCII
    const cleanHex = hex.replace(/\s/g, '');
    let ascii = '';
    for (let i = 0; i < cleanHex.length; i += 2) {
        const hexPair = cleanHex.substr(i, 2);
        const charCode = parseInt(hexPair, 16);
        // Only show printable ASCII characters (32-126), others as dots
        ascii += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
    }
    return ascii;
}

function hexToBinary(hex) {
    if (!hex) return '';
    const cleanHex = hex.replace(/\s/g, '');
    let binary = '';
    for (let i = 0; i < cleanHex.length; i += 2) {
        const hexPair = cleanHex.substr(i, 2);
        const byte = parseInt(hexPair, 16);
        binary += byte.toString(2).padStart(8, '0') + ' ';
    }
    return binary.trim();
}

function hexToDecimal(hex) {
    if (!hex) return '';
    const cleanHex = hex.replace(/\s/g, '');
    let decimal = '';
    for (let i = 0; i < cleanHex.length; i += 2) {
        const hexPair = cleanHex.substr(i, 2);
        decimal += parseInt(hexPair, 16) + ' ';
    }
    return decimal.trim();
}

function formatHexData(hex) {
    if (!hex) return '';
    // Format hex data with proper spacing (2 chars, space, repeat)
    const cleanHex = hex.replace(/\s/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < cleanHex.length; i += 2) {
        if (i > 0) formatted += ' ';
        formatted += cleanHex.substr(i, 2);
    }
    return formatted;
}

// Real-time packet processing (no simulation)
function processRealTimePacket(packetData) {
    // Ensure packet data matches the structure from Node.js server
    const rawHex = packetData.details?.payload?.hex || packetData.data || '';
    const formattedHex = formatHexData(rawHex);
    
    const packet = {
        id: packetData.id || `${Date.now()}-${Math.random()}`,
        timestamp: new Date(packetData.timestamp || Date.now()),
        direction: packetData.direction || 'unknown',
        type: packetData.typeName || packetData.type || 'UNKNOWN',
        size: packetData.size || 0,
        data: formattedHex,
        summary: packetData.summary || `${packetData.typeName || packetData.type} - ${packetData.size} bytes`,
        details: {
            header: packetData.details?.header || {},
            payload: {
                hex: formattedHex,
                ascii: hexToAscii(formattedHex),
                binary: hexToBinary(formattedHex),
                decimal: hexToDecimal(formattedHex),
                length: packetData.size || 0
            },
            sequence: packetData.sequence || 0
        }
    };
    
    // Add to beginning of logs array (newest first)
    packetLogs.unshift(packet);
    
    // Limit logs to prevent memory issues
    const maxLogs = parseInt(document.getElementById('maxEntries')?.value) || 100;
    if (packetLogs.length > maxLogs * 2) {
        packetLogs = packetLogs.slice(0, maxLogs * 2);
    }
    
    updateStats();
    renderLogs();
}

// Update statistics
function updateStats() {
    const total = packetLogs.length;
    const incoming = packetLogs.filter(p => p.direction === 'incoming').length;
    const outgoing = packetLogs.filter(p => p.direction === 'outgoing').length;
    const recent = packetLogs.filter(p => Date.now() - p.timestamp.getTime() < 3600000).length;
    
    document.getElementById('totalPackets').textContent = total;
    document.getElementById('incomingPackets').textContent = incoming;
    document.getElementById('outgoingPackets').textContent = outgoing;
    document.getElementById('recentPackets').textContent = recent;
}

// Render logs with enhanced display and expandable details
function renderLogs() {
    const container = document.getElementById('logsContainer');
    const filter = document.getElementById('packetFilter').value;
    
    let filteredLogs = packetLogs;
    if (filter && filter !== 'all') {
        filteredLogs = packetLogs.filter(p => {
            return p.direction && p.direction.toLowerCase() === filter.toLowerCase();
        });
        console.log(`🔍 Filtered ${packetLogs.length} packets to ${filteredLogs.length} for direction: ${filter}`);
    }
    
    if (filteredLogs.length === 0) {
        const message = isCapturing ? 
            '📡 Monitoring for packets from chat server...' : 
            '🔌 Connecting to chat server for packet monitoring...';
        container.innerHTML = `<div class="loading-text">${message}</div>`;
        return;
    }
    
    const displayLogs = filteredLogs.slice(0, 50); // Show last 50 packets
    
    const logsHtml = displayLogs.map((packet, index) => {
        const isExpanded = expandedPackets.has(packet.id);
        const directionSymbol = packet.direction === 'incoming' ? '⬇️' : '⬆️';
        
        return `
            <div class="log-entry ${packet.direction}" style="margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
                <div style="padding: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);" 
                     onclick="togglePacketDetails('${packet.id}')">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                        <span class="log-timestamp" style="color: #94a3b8; font-size: 0.8rem; min-width: 80px;">${packet.timestamp.toLocaleTimeString()}</span>
                        
                        <span class="direction-badge ${packet.direction}">
                            ${directionSymbol} ${packet.direction}
                        </span>
                        
                        <span class="packet-type-badge">
                            ${packet.type || 'UNKNOWN'}
                        </span>
                        
                        <span class="packet-size-badge">
                            ${packet.size} bytes
                        </span>
                    </div>
                    <span style="color: #64748b; font-size: 0.9rem; font-weight: bold;">${isExpanded ? '▲' : '▼'}</span>
                </div>
                
                ${isExpanded ? `
                    <div class="packet-details show">
                        <div class="packet-details-grid">
                            <div class="detail-section">
                                <h4>Packet Info</h4>
                                <div class="detail-field">
                                    <span class="label">Type:</span>
                                    <span class="value">${packet.type}</span>
                                </div>
                                <div class="detail-field">
                                    <span class="label">Direction:</span>
                                    <span class="value">${packet.direction}</span>
                                </div>
                                <div class="detail-field">
                                    <span class="label">Size:</span>
                                    <span class="value">${packet.size} bytes</span>
                                </div>
                                <div class="detail-field">
                                    <span class="label">Timestamp:</span>
                                    <span class="value">${packet.timestamp.toLocaleTimeString()}</span>
                                </div>
                            </div>
                            
                            ${packet.details?.header ? `
                                <div class="detail-section">
                                    <h4>Header Details</h4>
                                    ${Object.entries(packet.details.header).map(([key, value]) => `
                                        <div class="detail-field">
                                            <span class="label">${key}:</span>
                                            <span class="value">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="payload-section">
                            <h4>Payload Data</h4>
                            <div class="payload-tabs">
                                ${(() => {
                                    const activeTab = activePayloadTabs[packet.id] || 'hex';
                                    return `
                                        <div class="payload-tab ${activeTab === 'hex' ? 'active' : ''}" onclick="switchPayloadTab('${packet.id}', 'hex')">HEX</div>
                                        <div class="payload-tab ${activeTab === 'ascii' ? 'active' : ''}" onclick="switchPayloadTab('${packet.id}', 'ascii')">ASCII</div>
                                        <div class="payload-tab ${activeTab === 'binary' ? 'active' : ''}" onclick="switchPayloadTab('${packet.id}', 'binary')">Binary</div>
                                        <div class="payload-tab ${activeTab === 'decimal' ? 'active' : ''}" onclick="switchPayloadTab('${packet.id}', 'decimal')">Decimal</div>
                                    `;
                                })()}
                            </div>
                            
                            <div class="payload-content">
                                ${(() => {
                                    const activeTab = activePayloadTabs[packet.id] || 'hex';
                                    return `
                                        <div id="payload-hex-${packet.id}" class="hex-data" style="display: ${activeTab === 'hex' ? 'block' : 'none'};">
                                            ${packet.details?.payload?.hex || packet.data || 'No data available'}
                                        </div>
                                        <div id="payload-ascii-${packet.id}" class="ascii-data" style="display: ${activeTab === 'ascii' ? 'block' : 'none'};">
                                            ${packet.details?.payload?.ascii || hexToAscii(packet.data) || 'No ASCII data'}
                                        </div>
                                        <div id="payload-binary-${packet.id}" class="binary-data" style="display: ${activeTab === 'binary' ? 'block' : 'none'};">
                                            ${packet.details?.payload?.binary || hexToBinary(packet.data) || 'No binary data'}
                                        </div>
                                        <div id="payload-decimal-${packet.id}" class="decimal-data" style="display: ${activeTab === 'decimal' ? 'block' : 'none'};">
                                            ${packet.details?.payload?.decimal || hexToDecimal(packet.data) || 'No decimal data'}
                                        </div>
                                    `;
                                })()}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = logsHtml;
}

// Toggle packet details
function togglePacketDetails(packetId) {
    if (expandedPackets.has(packetId)) {
        expandedPackets.delete(packetId);
    } else {
        expandedPackets.add(packetId);
    }
    renderLogs();
}

// Store active tab for each packet to prevent reset on re-render
let activePayloadTabs = {};

// Switch payload data tab
function switchPayloadTab(packetId, tabType) {
    // Store the active tab
    activePayloadTabs[packetId] = tabType;
    
    // Hide all payload content for this packet
    const contentTypes = ['hex', 'ascii', 'binary', 'decimal'];
    contentTypes.forEach(type => {
        const element = document.getElementById(`payload-${type}-${packetId}`);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show the selected content
    const selectedElement = document.getElementById(`payload-${tabType}-${packetId}`);
    if (selectedElement) {
        selectedElement.style.display = 'block';
    }
    
    // Update tab styles
    const packetElement = document.querySelector(`[onclick*="${packetId}"]`).closest('.log-entry');
    if (packetElement) {
        const tabs = packetElement.querySelectorAll('.payload-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase() === tabType) {
                tab.classList.add('active');
            }
        });
    }
}

// Clear logs
async function clearLogs() {
    try {
        // Clear local logs immediately
        packetLogs = [];
        activePayloadTabs = {}; // Also clear tab state
        updateStats();
        renderLogs();
        console.log('🧹 Local logs cleared');
        
        // Stop monitoring temporarily to prevent new logs from appearing
        const wasCapturing = isCapturing;
        stopPacketMonitoring();
        
        // Try to clear server logs
        const response = await fetch('/api/admin/packet-logs/clear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Server logs cleared successfully:', result);
        } else {
            const errorText = await response.text();
            console.warn('⚠️ Server log clear failed:', response.status, errorText);
        }
        
        // Wait a moment then restart monitoring with fresh logs
        setTimeout(() => {
            if (wasCapturing) {
                // Clear any existing logs before restarting to prevent old logs from reappearing
                packetLogs = [];
                updateStats();
                renderLogs();
                startPacketMonitoring();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error clearing server logs:', error);
        // Restart monitoring even if server clear failed
        setTimeout(() => {
            // Clear any existing logs before restarting
            packetLogs = [];
            updateStats();
            renderLogs();
            startPacketMonitoring();
        }, 1500);
    }
}

// Export logs
async function exportLogs() {
    try {
        const response = await fetch('/api/admin/packet-logs/export?format=json', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `packet-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            throw new Error('Failed to export logs');
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        // Fallback to local export
        if (packetLogs.length === 0) {
            alert('No logs to export');
            return;
        }
        
        const data = JSON.stringify(packetLogs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `packet-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Filter change handler (applied after DOM is ready)
function setupFilterHandler() {
    const filterElement = document.getElementById('packetFilter');
    if (filterElement) {
        filterElement.addEventListener('change', () => {
            console.log('🔍 Filter changed to:', filterElement.value);
            renderLogs();
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set up filter handler
    setupFilterHandler();
    
    // Initialize direct Socket.IO connection to chat server
    initializeSocketConnection();
    
    // Set up fallback Socket.IO listeners (if global socket exists)
    setupPacketSocketListeners();
    
    // Initialize stats
    updateStats();
    
    // Auto-start packet monitoring after initial setup
    setTimeout(() => {
        if (!isSocketConnected) {
            console.log('🔌 Socket.IO not connected, starting API polling fallback');
            updatePacketConnectionIndicator({ connected: false });
            startPacketMonitoring(); // Start API polling
        }
    }, 2000);
    
    // Cleanup when page is unloaded
    window.addEventListener('beforeunload', () => {
        stopPacketMonitoring();
    });
});
@endsection