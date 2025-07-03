@extends('layouts.admin')

@section('title', 'Room Management - h2ktalk.fun Admin')

@section('styles')
/* Modern table styles - matching user management */
.rooms-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.rooms-table th {
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

.rooms-table td {
    padding: 16px;
    border-bottom: 1px solid #f3f4f6;
    color: #111827;
    font-size: 0.875rem;
}

.rooms-table tbody tr:hover {
    background: #f9fafb;
}

.rooms-table tbody tr:last-child td {
    border-bottom: none;
}

.room-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.room-avatar {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
}

.room-details {
    min-width: 0;
    flex: 1;
}

.room-name {
    font-weight: 600;
    color: #111827;
    margin-bottom: 2px;
}

.room-description {
    font-size: 0.75rem;
    color: #6b7280;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
}

.status-badge.active {
    background: #dcfce7;
    color: #166534;
}

.status-badge.inactive {
    background: #fef2f2;
    color: #991b1b;
}

.status-badge.private {
    background: #fef3c7;
    color: #92400e;
}

.user-count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #374151;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.15s ease;
    border: none;
    cursor: pointer;
    white-space: nowrap;
}

.btn-edit {
    background: #dbeafe;
    color: #1e40af;
}

.btn-edit:hover {
    background: #bfdbfe;
}

.btn-close {
    background: #fef3c7;
    color: #92400e;
}

.btn-close:hover {
    background: #fde68a;
}

.btn-delete {
    background: #fecaca;
    color: #991b1b;
}

.btn-delete:hover {
    background: #fca5a5;
}

.btn-view {
    background: #f3f4f6;
    color: #374151;
}

.btn-view:hover {
    background: #e5e7eb;
}

.search-box {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.search-input {
    flex: 1;
    max-width: 320px;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease;
}

.search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-btn {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
}

.search-btn:hover {
    background: #2563eb;
}

.loading-text,
.no-rooms {
    text-align: center;
    color: #6b7280;
    padding: 3rem;
    font-size: 0.875rem;
}

.pagination {
    display: flex;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 1.5rem;
}

.pagination button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 0.375rem;
}

.pagination button:hover:not(:disabled) {
    background: #f9fafb;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination .active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.pagination .active:hover {
    background: #2563eb;
}

/* Server Control Section */
.server-controls {
    margin-bottom: 2rem;
}

.control-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
}

.server-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #6b7280;
}

.status-indicator.running {
    background: #10b981;
}

.status-indicator.stopped {
    background: #ef4444;
}

.control-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
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

/* Edit Modal */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 2rem;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
}

.close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
}

.close:hover {
    color: #374151;
}

.form-group {
    margin-bottom: 1rem;
}

.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
}

.form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

.form-checkbox {
    margin-right: 0.5rem;
}

.modal-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
}

.btn-cancel {
    background: #f3f4f6;
    color: #374151;
}

.btn-cancel:hover {
    background: #e5e7eb;
}

.btn-save {
    background: #3b82f6;
    color: white;
}

.btn-save:hover {
    background: #2563eb;
}

@media (max-width: 768px) {
    .search-box {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .search-input {
        max-width: none;
    }
    
    .rooms-table {
        font-size: 0.8rem;
    }
    
    .room-info {
        gap: 8px;
    }
    
    .room-avatar {
        width: 28px;
        height: 28px;
        font-size: 0.75rem;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .control-buttons {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .rooms-table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
    }
    
    .modal-content {
        margin: 2% auto;
        width: 95%;
    }
}
@endsection

@section('content')
<!-- Page Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Room Management
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Manage chat rooms, monitor users, and control room settings.
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

<!-- Server controls moved to main dashboard -->

<!-- Rooms Table Card -->
<div class="bg-white shadow rounded-lg">
    <!-- Card Header -->
    <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
        <div class="md:flex md:items-center md:justify-between">
            <div class="min-w-0 flex-1">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Active Chat Rooms</h3>
                <p class="mt-1 text-sm text-gray-500">Manage all chat rooms and their settings.</p>
            </div>
            <div class="mt-4 md:ml-4 md:mt-0">
                <div class="search-box">
                    <input type="text" 
                           id="searchInput" 
                           class="search-input" 
                           placeholder="Search rooms..." 
                           maxlength="50">
                    <button class="search-btn" onclick="searchRooms()">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        Search
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Table Content -->
    <div id="roomsContent" class="loading-text">
        <div class="flex items-center justify-center py-12">
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="text-gray-500">Loading rooms...</span>
            </div>
        </div>
    </div>
</div>

<!-- Edit Room Modal -->
<div id="editModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">Edit Room</h2>
            <button class="close" onclick="closeEditModal()">&times;</button>
        </div>
        <form id="editForm">
            <div class="form-group">
                <label class="form-label" for="edit-name">Room Name</label>
                <input type="text" id="edit-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="edit-description">Description</label>
                <textarea id="edit-description" class="form-input form-textarea"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label" for="edit-max-users">Max Users</label>
                <input type="number" id="edit-max-users" class="form-input" min="1" max="100">
            </div>
            <div class="form-group">
                <label class="form-label" for="edit-password">Password (optional)</label>
                <input type="password" id="edit-password" class="form-input">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" id="edit-private" class="form-checkbox">
                    Private Room
                </label>
            </div>
            <div class="modal-buttons">
                <button type="button" class="action-btn btn-cancel" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="action-btn btn-save">Save Changes</button>
            </div>
        </form>
    </div>
</div>

@endsection

@section('scripts')
let allRooms = [];
let filteredRooms = [];
let currentPage = 1;
const roomsPerPage = 10;
let currentEditRoomId = null;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load server status on page load
checkServerStatus();

// Load all rooms
async function loadRooms() {
    try {
        const response = await fetch('/api/admin/rooms', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            allRooms = data.rooms || [];
            filteredRooms = [...allRooms];
            renderRooms();
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error(`Failed to load rooms: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        document.getElementById('roomsContent').innerHTML = 
            '<div class="no-rooms">Chat server not available. Please check server status.</div>';
    }
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('/api/admin/server/status', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateServerStatus(data.status, data.health);
        } else {
            updateServerStatus('unknown');
        }
    } catch (error) {
        console.error('Error checking server status:', error);
        updateServerStatus('unknown');
    }
}

// Update server status display
function updateServerStatus(status, health = null) {
    const indicator = document.getElementById('server-status-indicator');
    const text = document.getElementById('server-status-text');
    const startBtn = document.getElementById('start-server-btn');
    const stopBtn = document.getElementById('stop-server-btn');
    const restartBtn = document.getElementById('restart-server-btn');
    
    // Reset button states (only if elements exist)
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
    if (restartBtn) restartBtn.disabled = false;
    
    switch(status) {
        case 'running':
            if (indicator) indicator.className = 'status-indicator running';
            if (text) text.textContent = 'Server is running';
            if (startBtn) startBtn.disabled = true;
            if (health) {
                // Load rooms if server is running
                loadRooms();
            }
            break;
        case 'stopped':
            if (indicator) indicator.className = 'status-indicator stopped';
            if (text) text.textContent = 'Server is stopped';
            if (stopBtn) stopBtn.disabled = true;
            if (restartBtn) restartBtn.disabled = true;
            break;
        default:
            if (indicator) indicator.className = 'status-indicator';
            if (text) text.textContent = 'Server status unknown';
            break;
    }
}

// Start server
async function startServer() {
    const startBtn = document.getElementById('start-server-btn');
    if (!startBtn) return; // Exit if button doesn't exist
    
    startBtn.disabled = true;
    startBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>Starting...';
    
    try {
        const response = await fetch('/api/admin/server/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Server started successfully', 'success');
            setTimeout(() => {
                checkServerStatus();
            }, 2000);
        } else {
            showToast(data.error || 'Failed to start server', 'error');
        }
    } catch (error) {
        console.error('Error starting server:', error);
        showToast('Error starting server. Please try again.', 'error');
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Start Server';
    }
}

// Stop server
async function stopServer() {
    if (!confirm('Are you sure you want to stop the chat server? All users will be disconnected.')) {
        return;
    }
    
    const stopBtn = document.getElementById('stop-server-btn');
    if (!stopBtn) return; // Exit if button doesn't exist
    
    stopBtn.disabled = true;
    stopBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>Stopping...';
    
    try {
        const response = await fetch('/api/admin/server/stop', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Server stopped successfully', 'success');
            setTimeout(() => {
                checkServerStatus();
                // Clear rooms display
                document.getElementById('roomsContent').innerHTML = 
                    '<div class="no-rooms">Server is stopped. Start the server to manage rooms.</div>';
            }, 1000);
        } else {
            showToast(data.error || 'Failed to stop server', 'error');
        }
    } catch (error) {
        console.error('Error stopping server:', error);
        showToast('Error stopping server. Please try again.', 'error');
    } finally {
        stopBtn.disabled = false;
        stopBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Stop Server';
    }
}

// Restart server
async function restartServer() {
    if (!confirm('Are you sure you want to restart the chat server? All users will be temporarily disconnected.')) {
        return;
    }
    
    const restartBtn = document.getElementById('restart-server-btn');
    if (!restartBtn) return; // Exit if button doesn't exist
    
    restartBtn.disabled = true;
    restartBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>Restarting...';
    
    try {
        // Stop first
        await fetch('/api/admin/server/stop', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start again
        const response = await fetch('/api/admin/server/start', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Server restarted successfully', 'success');
            setTimeout(() => {
                checkServerStatus();
            }, 3000);
        } else {
            showToast(data.error || 'Failed to restart server', 'error');
        }
    } catch (error) {
        console.error('Error restarting server:', error);
        showToast('Error restarting server. Please try again.', 'error');
    } finally {
        restartBtn.disabled = false;
        restartBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Restart Server';
    }
}

// Render rooms table
function renderRooms() {
    const roomsContent = document.getElementById('roomsContent');
    
    if (filteredRooms.length === 0) {
        roomsContent.innerHTML = '<div class="no-rooms">No rooms found matching your search criteria.</div>';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
    const startIndex = (currentPage - 1) * roomsPerPage;
    const endIndex = startIndex + roomsPerPage;
    const currentRooms = filteredRooms.slice(startIndex, endIndex);
    
    // Generate table HTML
    let tableHTML = `
        <table class="rooms-table">
            <thead>
                <tr>
                    <th>Room</th>
                    <th>Users</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    currentRooms.forEach(room => {
        const roomId = room.id;
        const roomName = room.name || 'Unnamed Room';
        const description = room.description || 'No description';
        const userCount = room.userCount || 0;
        const maxUsers = room.maxUsers || 'Unlimited';
        const isPrivate = room.isPrivate || false;
        const isActive = room.isActive !== false;
        
        // Generate avatar initials
        const initials = roomName.charAt(0).toUpperCase();
        
        const statusBadge = getStatusBadge(isActive, isPrivate);
        
        const createdDate = room.createdAt ? 
            new Date(room.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Unknown';
        
        tableHTML += `
            <tr>
                <td>
                    <div class="room-info">
                        <div class="room-avatar">${initials}</div>
                        <div class="room-details">
                            <div class="room-name">${escapeHtml(roomName)}</div>
                            <div class="room-description">${escapeHtml(description)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="user-count">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0H21v-1a6 6 0 00-9-5.197"></path>
                        </svg>
                        <span>${userCount}/${maxUsers}</span>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td><span class="text-sm text-gray-500">${createdDate}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-view" onclick="viewRoom('${roomId}')">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            View
                        </button>
                        <button class="action-btn btn-edit" onclick="editRoom('${roomId}')">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Edit
                        </button>
                        <button class="action-btn btn-close" onclick="closeRoom('${roomId}', '${escapeHtml(roomName)}')">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                            </svg>
                            Close
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteRoom('${roomId}', '${escapeHtml(roomName)}')">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    
    // Add pagination
    if (totalPages > 1) {
        tableHTML += '<div class="px-4 py-3 border-t border-gray-200">';
        tableHTML += '<div class="pagination">';
        
        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        tableHTML += `<button onclick="changePage(${currentPage - 1})" ${prevDisabled}>
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Previous
        </button>`;
        
        // Page numbers (show max 7 pages around current page)
        const maxVisiblePages = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Show first page and ellipsis if needed
        if (startPage > 1) {
            tableHTML += `<button onclick="changePage(1)">1</button>`;
            if (startPage > 2) {
                tableHTML += `<span class="px-3 py-2 text-gray-500">...</span>`;
            }
        }
        
        // Show page range
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            tableHTML += `<button class="${activeClass}" onclick="changePage(${i})">${i}</button>`;
        }
        
        // Show last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                tableHTML += `<span class="px-3 py-2 text-gray-500">...</span>`;
            }
            tableHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        tableHTML += `<button onclick="changePage(${currentPage + 1})" ${nextDisabled}>
            Next
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
        </button>`;
        
        tableHTML += '</div></div>';
    }
    
    roomsContent.innerHTML = tableHTML;
}

// Search rooms
function searchRooms() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredRooms = [...allRooms];
    } else {
        filteredRooms = allRooms.filter(room => {
            const name = (room.name || '').toLowerCase();
            const description = (room.description || '').toLowerCase();
            
            return name.includes(searchTerm) || description.includes(searchTerm);
        });
    }
    
    currentPage = 1;
    renderRooms();
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderRooms();
    }
}

// Get status badge
function getStatusBadge(isActive, isPrivate) {
    if (!isActive) {
        return '<span class="status-badge inactive">Inactive</span>';
    } else if (isPrivate) {
        return '<span class="status-badge private">Private</span>';
    } else {
        return '<span class="status-badge active">Active</span>';
    }
}

// View room details (could redirect to detailed view)
function viewRoom(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
        alert(`Room: ${room.name}\nDescription: ${room.description || 'No description'}\nUsers: ${room.userCount || 0}/${room.maxUsers || 'Unlimited'}\nPrivate: ${room.isPrivate ? 'Yes' : 'No'}`);
    }
}

// Edit room
function editRoom(roomId) {
    // Redirect to the edit room page
    window.location.href = `/admin/rooms/${roomId}/edit`;
}

// Room edit functionality moved to separate page

// Close room
async function closeRoom(roomId, roomName) {
    if (!confirm(`Are you sure you want to close room "${roomName}"? All users will be kicked from the room.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/rooms/${roomId}/close`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Room closed successfully', 'success');
            loadRooms(); // Reload the rooms list
        } else {
            showToast(data.error || 'Failed to close room', 'error');
        }
    } catch (error) {
        console.error('Error closing room:', error);
        showToast('Error closing room. Please try again.', 'error');
    }
}

// Delete room
async function deleteRoom(roomId, roomName) {
    if (!confirm(`Are you sure you want to delete room "${roomName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Room deleted successfully', 'success');
            loadRooms(); // Reload the rooms list
        } else {
            showToast(data.error || 'Failed to delete room', 'error');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        showToast('Error deleting room. Please try again.', 'error');
    }
}

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

// Search on Enter key
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchRooms();
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}

// Initial load - will be called when server status check is complete
document.addEventListener('DOMContentLoaded', function() {
    // Server status check will trigger room loading if server is running
});
@endsection