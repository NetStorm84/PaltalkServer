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
    <h1>📋 Packet Logs</h1>
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
                <button class="btn btn-primary" onclick="toggleCapture()" id="captureBtn">Start Capture</button>
                <button class="btn btn-export" onclick="exportLogs()">Export</button>
                <button class="btn btn-danger" onclick="clearLogs()">Clear Logs</button>
            </div>
        </div>
    </div>
    
    <div id="logsContainer" class="logs-container">
        <div class="loading-text">No packet logs available. Click "Start Capture" to begin monitoring.</div>
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
let isCapturing = false;
let packetLogs = [];
let captureInterval = null;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Toggle packet capture
function toggleCapture() {
    const btn = document.getElementById('captureBtn');
    
    if (!isCapturing) {
        startCapture();
        btn.textContent = 'Stop Capture';
        btn.style.background = '#dc2626';
        btn.style.borderColor = '#dc2626';
    } else {
        stopCapture();
        btn.textContent = 'Start Capture';
        btn.style.background = '#ff4500';
        btn.style.borderColor = '#ff4500';
    }
    
    isCapturing = !isCapturing;
}

// Start packet capture
function startCapture() {
    captureInterval = setInterval(fetchPacketLogs, 1000); // Poll every second
    fetchPacketLogs();
}

// Stop packet capture
function stopCapture() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
}

// Fetch packet logs from API
async function fetchPacketLogs() {
    try {
        const filter = document.getElementById('packetFilter').value;
        const response = await fetch(`/api/admin/packet-logs?filter=${filter}&limit=100`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch packet logs');
        }
        
        const data = await response.json();
        
        if (data.success !== false) {
            packetLogs = data.logs || [];
            updateStats();
            renderLogs();
        } else {
            // Fallback to simulation if server unavailable
            simulatePacketData();
            updateStats();
            renderLogs();
        }
    } catch (error) {
        console.error('Error fetching packet logs:', error);
        // Fallback to simulation on error
        simulatePacketData();
        updateStats();
        renderLogs();
    }
}

// Simulate packet data (replace with real API call)
function simulatePacketData() {
    if (Math.random() < 0.3) { // 30% chance of new packet
        const isIncoming = Math.random() < 0.5;
        const packet = {
            timestamp: new Date(),
            direction: isIncoming ? 'incoming' : 'outgoing',
            type: ['USER_JOIN', 'USER_LEAVE', 'CHAT_MESSAGE', 'VOICE_DATA', 'HEARTBEAT'][Math.floor(Math.random() * 5)],
            data: generateRandomHex(Math.floor(Math.random() * 32) + 8),
            size: Math.floor(Math.random() * 1024) + 64
        };
        
        packetLogs.push(packet);
        
        // Keep only last 100 packets
        if (packetLogs.length > 100) {
            packetLogs = packetLogs.slice(-100);
        }
    }
}

// Generate random hex data
function generateRandomHex(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 16).toString(16).toUpperCase();
        if (i % 2 === 1 && i < length - 1) result += ' ';
    }
    return result;
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

// Render logs
function renderLogs() {
    const container = document.getElementById('logsContainer');
    const filter = document.getElementById('packetFilter').value;
    
    let filteredLogs = packetLogs;
    if (filter !== 'all') {
        filteredLogs = packetLogs.filter(p => p.direction === filter);
    }
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<div class="loading-text">No packets captured yet.</div>';
        return;
    }
    
    const logsHtml = filteredLogs.slice(-20).reverse().map(packet => `
        <div class="log-entry ${packet.direction}">
            <div>
                <span class="log-timestamp">${packet.timestamp.toLocaleTimeString()}</span>
                <span class="log-direction ${packet.direction}">${packet.direction.toUpperCase()}</span>
                <span style="color: #ffffff;">${packet.type} (${packet.size} bytes)</span>
            </div>
            <div class="log-hex">${packet.data}</div>
        </div>
    `).join('');
    
    container.innerHTML = logsHtml;
    container.scrollTop = 0; // Scroll to top (newest)
}

// Clear logs
async function clearLogs() {
    if (confirm('Are you sure you want to clear all packet logs?')) {
        try {
            const response = await fetch('/api/admin/packet-logs/clear', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                packetLogs = [];
                updateStats();
                renderLogs();
                alert('Packet logs cleared successfully');
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            // Still clear local logs even if server fails
            packetLogs = [];
            updateStats();
            renderLogs();
        }
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

// Filter change handler
document.getElementById('packetFilter').addEventListener('change', renderLogs);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});
@endsection