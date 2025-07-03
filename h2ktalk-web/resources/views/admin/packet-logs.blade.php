@extends('layouts.admin')

@section('title', 'Packet Logs - h2ktalk.fun Admin')

@section('styles')
/* Modern admin styling to match dashboard theme */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
}

.stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.logs-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.logs-table th {
    background: #f8fafc;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
}

.logs-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    color: #111827;
    font-size: 0.875rem;
}

.logs-table tbody tr:hover {
    background: #f9fafb;
}

.logs-table tbody tr:last-child td {
    border-bottom: none;
}

.packet-type {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: monospace;
}

.packet-type.incoming {
    background: #dcfce7;
    color: #166534;
}

.packet-type.outgoing {
    background: #dbeafe;
    color: #1e40af;
}

.packet-type.error {
    background: #fecaca;
    color: #991b1b;
}

.error-row {
    background: #fef2f2 !important;
    color: #991b1b;
    padding: 8px 16px;
    font-size: 0.875rem;
    border-left: 4px solid #ef4444;
}

.packet-data {
    font-family: monospace;
    font-size: 0.75rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
}

.packet-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
}

.packet-details-row {
    background: #f8fafc !important;
}

.packet-details-container {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin: 0.5rem;
    background: white;
}

.details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.detail-section {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.75rem;
}

.detail-section h4 {
    color: #374151;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.detail-field {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
}

.detail-field .label {
    color: #6b7280;
    font-weight: 500;
}

.detail-field .value {
    color: #111827;
    font-weight: 500;
    font-family: monospace;
}

.payload-section {
    grid-column: 1 / -1;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.75rem;
}

.payload-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.payload-tab {
    background: #e5e7eb;
    color: #6b7280;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.15s ease;
}

.payload-tab.active {
    background: #3b82f6;
    color: white;
}

.payload-content {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 0.25rem;
    padding: 0.75rem;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
    word-break: break-all;
    line-height: 1.4;
    color: #f3f4f6;
}

.hex-data { color: #fbbf24; }
.ascii-data { color: #34d399; }
.binary-data { color: #a78bfa; }
.decimal-data { color: #fb7185; }

.btn-view {
    background: #e0e7ff;
    color: #3730a3;
    padding: 0.25rem;
    border-radius: 0.25rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
}

.btn-view:hover {
    background: #c7d2fe;
}

.control-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.filter-select,
.filter-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
    color: #111827;
}

.filter-select:focus,
.filter-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
}

.btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
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

.btn-danger {
    background: #dc2626;
    color: white;
    border: none;
}

.btn-danger:hover {
    background: #b91c1c;
}

.loading-text {
    text-align: center;
    color: #6b7280;
    padding: 3rem;
    font-size: 0.875rem;
}

.no-logs {
    text-align: center;
    color: #6b7280;
    padding: 3rem;
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .control-group {
        flex-direction: column;
        align-items: stretch;
    }
    
    .logs-table {
        font-size: 0.75rem;
    }
    
    .packet-data {
        max-width: 150px;
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
                Packet Logs
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Monitor real-time packet communication between clients and server.
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
        <div class="stat-value" id="errorPackets">-</div>
        <div class="stat-label">Errors</div>
    </div>
</div>

<!-- Logs Table Card -->
<div class="bg-white shadow rounded-lg">
    <!-- Card Header -->
    <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
        <div class="md:flex md:items-center md:justify-between">
            <div class="min-w-0 flex-1">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Recent Packet Activity</h3>
                <p class="mt-1 text-sm text-gray-500">Real-time view of network packets and their details.</p>
            </div>
            <div class="mt-4 md:ml-4 md:mt-0">
                <div class="control-group">
                    <select id="filterType" class="filter-select">
                        <option value="all">All Packets</option>
                        <option value="incoming">Incoming Only</option>
                        <option value="outgoing">Outgoing Only</option>
                        <option value="errors">Errors Only</option>
                    </select>
                    
                    <input type="number" id="limitInput" class="filter-input" placeholder="Limit" value="100" min="10" max="1000" style="width: 100px;">
                    
                    <button class="btn btn-primary" onclick="loadLogs()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Refresh
                    </button>
                    
                    <button class="btn btn-danger" onclick="clearLogs()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Clear
                    </button>
                    
                    <button class="btn btn-secondary" onclick="exportLogs()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Export
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Table Content -->
    <div id="logsContent" class="loading-text">
        <div class="flex items-center justify-center py-12">
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="text-gray-500">Loading packet logs...</span>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load packet logs
async function loadLogs() {
    const filter = document.getElementById('filterType').value;
    const limit = document.getElementById('limitInput').value || 100;
    
    try {
        const response = await fetch(`/api/admin/packet-logs?filter=${filter}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderLogs(data.logs || []);
            updateStats(data.stats || {});
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error('Failed to load logs');
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsContent').innerHTML = 
            '<div class="no-logs">Error loading logs. Please try again.</div>';
    }
}

// Render logs table
function renderLogs(logs) {
    const logsContent = document.getElementById('logsContent');
    
    if (!logs || logs.length === 0) {
        logsContent.innerHTML = '<div class="no-logs">No packet logs found.</div>';
        return;
    }
    
    try {
        let tableHTML = `
            <table class="logs-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Name/Type</th>
                        <th>Direction</th>
                        <th>Client/User</th>
                        <th>Size</th>
                        <th>Data Preview</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        logs.forEach((log, index) => {
            try {
                const timestamp = new Date(log.timestamp).toLocaleTimeString();
                const typeClass = log.direction === 'incoming' ? 'incoming' : 'outgoing';
                const packetData = log.data ? String(log.data).substring(0, 40) + (log.data.length > 40 ? '...' : '') : 'N/A';
                const packetName = getPacketName(log.type, log.data);
                const clientName = log.clientName || log.nickname || `Client ${log.clientId || 'Unknown'}`;
                
                tableHTML += `
                    <tr>
                        <td><span class="text-sm font-mono">${escapeHtml(timestamp)}</span></td>
                        <td>
                            <div class="packet-name">${escapeHtml(packetName)}</div>
                            <div class="packet-type ${typeClass}">${escapeHtml(log.type || 'UNKNOWN')}</div>
                        </td>
                        <td><span class="capitalize text-sm">${escapeHtml(log.direction)}</span></td>
                        <td><span class="text-sm font-medium">${escapeHtml(clientName)}</span></td>
                        <td><span class="text-sm">${escapeHtml(log.size || 0)} bytes</span></td>
                        <td><span class="packet-data">${escapeHtml(packetData)}</span></td>
                        <td>
                            <button class="btn-view" onclick="viewPacketDetails(${index})" title="View Details">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                            </button>
                        </td>
                    </tr>
                    <tr id="details-${index}" class="packet-details-row" style="display: none;">
                <td colspan="7">
                    <div class="packet-details-container">
                        <div class="details-loading">Loading packet details...</div>
                    </div>
                </td>
            </tr>
        `;
            } catch (logError) {
                console.error('Error rendering log entry:', logError, 'Log data:', log);
                // Add error row for debugging
                tableHTML += `
                    <tr>
                        <td colspan="7" class="error-row">
                            <span class="text-red-600">Error rendering log entry: ${escapeHtml(logError.message)}</span>
                        </td>
                    </tr>
                `;
            }
        });
        
        tableHTML += '</tbody></table>';
        logsContent.innerHTML = tableHTML;
        
        // Store logs globally for detail viewing
        window.currentLogs = logs;
        
    } catch (error) {
        console.error('Error in renderLogs:', error);
        logsContent.innerHTML = '<div class="no-logs">Error rendering packet logs. Please refresh.</div>';
    }
}

// Update stats
function updateStats(stats) {
    document.getElementById('totalPackets').textContent = stats.total || 0;
    document.getElementById('incomingPackets').textContent = stats.incoming || 0;
    document.getElementById('outgoingPackets').textContent = stats.outgoing || 0;
    document.getElementById('errorPackets').textContent = stats.errors || 0;
}

// Clear logs
async function clearLogs() {
    if (!confirm('Are you sure you want to clear all packet logs? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/packet-logs/clear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Logs cleared successfully', 'success');
            loadLogs();
        } else {
            throw new Error('Failed to clear logs');
        }
    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Error clearing logs', 'error');
    }
}

// Export logs
async function exportLogs() {
    try {
        const response = await fetch('/api/admin/packet-logs/export?format=csv', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'text/csv'
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `packet-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('Logs exported successfully', 'success');
        } else {
            throw new Error('Failed to export logs');
        }
    } catch (error) {
        console.error('Error exporting logs:', error);
        showToast('Error exporting logs', 'error');
    }
}

// Get packet name from type and data
function getPacketName(type, data) {
    const packetNames = {
        'JOIN_ROOM': 'Join Room Request',
        'LEAVE_ROOM': 'Leave Room Request',
        'SEND_MESSAGE': 'Send Message',
        'USER_LOGIN': 'User Login',
        'USER_LOGOUT': 'User Logout',
        'VOICE_DATA': 'Voice Data',
        'USER_LIST': 'User List Update',
        'ROOM_LIST': 'Room List Update',
        'KEEPALIVE': 'Keep Alive',
        'HEARTBEAT': 'Heartbeat',
        'AUTH': 'Authentication',
        'ERROR': 'Error Response'
    };
    
    if (packetNames[type]) {
        return packetNames[type];
    }
    
    // Try to infer from data
    if (data) {
        if (data.includes('login')) return 'Login Packet';
        if (data.includes('message')) return 'Message Packet';
        if (data.includes('room')) return 'Room Packet';
        if (data.includes('voice')) return 'Voice Packet';
    }
    
    return type || 'Unknown Packet';
}

// View packet details
function viewPacketDetails(index) {
    const detailsRow = document.getElementById(`details-${index}`);
    const log = window.currentLogs[index];
    
    if (detailsRow.style.display === 'none') {
        // Show details
        detailsRow.style.display = 'table-row';
        renderPacketDetails(index, log);
    } else {
        // Hide details
        detailsRow.style.display = 'none';
    }
}

// Render packet details
function renderPacketDetails(index, log) {
    const container = document.querySelector(`#details-${index} .packet-details-container`);
    
    const detailsHTML = `
        <div class="details-grid">
            <div class="detail-section">
                <h4>Packet Information</h4>
                <div class="detail-field">
                    <span class="label">Type:</span>
                    <span class="value">${log.type || 'Unknown'}</span>
                </div>
                <div class="detail-field">
                    <span class="label">Direction:</span>
                    <span class="value">${log.direction}</span>
                </div>
                <div class="detail-field">
                    <span class="label">Size:</span>
                    <span class="value">${log.size || 0} bytes</span>
                </div>
                <div class="detail-field">
                    <span class="label">Timestamp:</span>
                    <span class="value">${new Date(log.timestamp).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Client Information</h4>
                <div class="detail-field">
                    <span class="label">Client ID:</span>
                    <span class="value">${log.clientId || 'Unknown'}</span>
                </div>
                <div class="detail-field">
                    <span class="label">Username:</span>
                    <span class="value">${log.clientName || log.nickname || 'Unknown'}</span>
                </div>
                <div class="detail-field">
                    <span class="label">IP Address:</span>
                    <span class="value">${log.clientIp || 'N/A'}</span>
                </div>
                <div class="detail-field">
                    <span class="label">User Agent:</span>
                    <span class="value">${log.userAgent || 'N/A'}</span>
                </div>
            </div>
            
            <div class="payload-section">
                <h4>Packet Data</h4>
                <div class="payload-tabs">
                    <button class="payload-tab active" onclick="showPayloadTab(${index}, 'hex')">Hex</button>
                    <button class="payload-tab" onclick="showPayloadTab(${index}, 'ascii')">ASCII</button>
                    <button class="payload-tab" onclick="showPayloadTab(${index}, 'binary')">Binary</button>
                    <button class="payload-tab" onclick="showPayloadTab(${index}, 'decimal')">Decimal</button>
                </div>
                <div id="payload-content-${index}" class="payload-content">
                    ${formatHexData(log.data || '')}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = detailsHTML;
}

// Show payload tab
function showPayloadTab(index, format) {
    const log = window.currentLogs[index];
    const content = document.getElementById(`payload-content-${index}`);
    const tabs = document.querySelectorAll(`#details-${index} .payload-tab`);
    
    // Update active tab
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update content
    switch(format) {
        case 'hex':
            content.innerHTML = formatHexData(log.data || '');
            break;
        case 'ascii':
            content.innerHTML = formatAsciiData(log.data || '');
            break;
        case 'binary':
            content.innerHTML = formatBinaryData(log.data || '');
            break;
        case 'decimal':
            content.innerHTML = formatDecimalData(log.data || '');
            break;
    }
}

// Format data as hex
function formatHexData(data) {
    if (!data) return '<span class="hex-data">No data available</span>';
    
    let hex = '';
    for (let i = 0; i < data.length; i++) {
        const code = data.charCodeAt(i);
        hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
        if ((i + 1) % 16 === 0) hex += '\n';
    }
    
    return `<span class="hex-data">${hex}</span>`;
}

// Format data as ASCII
function formatAsciiData(data) {
    if (!data) return '<span class="ascii-data">No data available</span>';
    
    let ascii = '';
    for (let i = 0; i < data.length; i++) {
        const code = data.charCodeAt(i);
        if (code >= 32 && code <= 126) {
            ascii += data.charAt(i);
        } else {
            ascii += '.';
        }
        if ((i + 1) % 64 === 0) ascii += '\n';
    }
    
    return `<span class="ascii-data">${escapeHtml(ascii)}</span>`;
}

// Format data as binary
function formatBinaryData(data) {
    if (!data) return '<span class="binary-data">No data available</span>';
    
    let binary = '';
    for (let i = 0; i < Math.min(data.length, 100); i++) { // Limit to first 100 chars
        const code = data.charCodeAt(i);
        binary += code.toString(2).padStart(8, '0') + ' ';
        if ((i + 1) % 8 === 0) binary += '\n';
    }
    
    if (data.length > 100) {
        binary += '\n... (truncated)';
    }
    
    return `<span class="binary-data">${binary}</span>`;
}

// Format data as decimal
function formatDecimalData(data) {
    if (!data) return '<span class="decimal-data">No data available</span>';
    
    let decimal = '';
    for (let i = 0; i < Math.min(data.length, 200); i++) { // Limit to first 200 chars
        const code = data.charCodeAt(i);
        decimal += code.toString().padStart(3, '0') + ' ';
        if ((i + 1) % 16 === 0) decimal += '\n';
    }
    
    if (data.length > 200) {
        decimal += '\n... (truncated)';
    }
    
    return `<span class="decimal-data">${decimal}</span>`;
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    // Convert to string if it's not already
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

// Auto-refresh logs every 5 seconds
let autoRefreshInterval;

function startAutoRefresh() {
    autoRefreshInterval = setInterval(loadLogs, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// Load logs when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadLogs();
    startAutoRefresh();
});

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});
</script>
@endsection