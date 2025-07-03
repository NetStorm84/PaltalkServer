@extends('layouts.admin')

@section('title', 'Edit Room - h2ktalk.fun Admin')

@section('styles')
.form-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.form-group {
    margin-bottom: 1.5rem;
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
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-primary {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
}

.btn-primary:hover {
    background: #2563eb;
}

.btn-secondary {
    background: white;
    color: #374151;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
}

.btn-secondary:hover {
    background: #f9fafb;
}

.action-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
    margin-top: 1.5rem;
}

.status-indicator {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: 1rem;
}

.status-indicator.active {
    background: #dcfce7;
    color: #166534;
}

.status-indicator.closed {
    background: #fef2f2;
    color: #991b1b;
}

.status-indicator.locked {
    background: #fef3c7;
    color: #92400e;
}

.loading-spinner {
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 0.5rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .action-buttons {
        flex-direction: column-reverse;
    }
}
@endsection

@section('content')
<!-- Page Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <nav class="flex" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-4">
                    <li>
                        <div>
                            <a href="{{ route('admin.dashboard') }}" class="text-gray-400 hover:text-gray-500">
                                <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                                </svg>
                                <span class="sr-only">Dashboard</span>
                            </a>
                        </div>
                    </li>
                    <li>
                        <div class="flex items-center">
                            <svg class="h-5 w-5 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <a href="{{ route('admin.rooms') }}" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">Rooms</a>
                        </div>
                    </li>
                    <li>
                        <div class="flex items-center">
                            <svg class="h-5 w-5 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="ml-4 text-sm font-medium text-gray-500">Edit Room</span>
                        </div>
                    </li>
                </ol>
            </nav>
            <h1 class="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Edit Room
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Update room settings, permissions, and configuration.
            </p>
        </div>
    </div>
</div>

<!-- Loading State -->
<div id="loadingState" class="form-card p-6">
    <div class="flex items-center justify-center py-12">
        <div class="flex items-center space-x-2">
            <div class="loading-spinner"></div>
            <span class="text-gray-500">Loading room data...</span>
        </div>
    </div>
</div>

<!-- Room Form -->
<div id="roomForm" class="form-card p-6" style="display: none;">
    <!-- Room Status Indicator -->
    <div id="roomStatus" class="status-indicator active">
        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        Room Status: <span id="statusText">Active</span>
    </div>

    <form id="editForm">
        <!-- Basic Information -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div class="form-group">
                <label for="roomName" class="form-label">Room Name <span class="text-red-500">*</span></label>
                <input type="text" id="roomName" name="name" class="form-input" placeholder="Enter room name" required maxlength="64">
            </div>
            
            <div class="form-group">
                <label for="roomTopic" class="form-label">Topic</label>
                <input type="text" id="roomTopic" name="topic" class="form-input" placeholder="Enter room topic" maxlength="255">
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="roomCategory" class="form-label">Category</label>
                    <select id="roomCategory" name="category" class="form-select">
                        <option value="30001">Top Rooms</option>
                        <option value="30002">Featured Rooms</option>
                        <option value="30003">Paltalk Help Rooms</option>
                        <option value="30004">Paltalk Radio</option>
                        <option value="30005">Distance Learning</option>
                        <option value="30006">Meet New Friends</option>
                        <option value="30007">Love and Romance</option>
                        <option value="30008">Social Issues</option>
                        <option value="30018">Young Adults (18+)</option>
                        <option value="30019">Religious</option>
                        <option value="30020">Christianity</option>
                        <option value="30021">Islam</option>
                        <option value="30022">Judaism</option>
                        <option value="30023">Health Related / Parenting</option>
                        <option value="30024">Computers - Hi Tech</option>
                        <option value="30025">Sports and Hobbies</option>
                        <option value="30026">Business and Finance</option>
                        <option value="30027">Music</option>
                        <option value="30028">Miscellaneous</option>
                        <option value="30029">Adult Oriented</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="roomType" class="form-label">Room Type</label>
                    <select id="roomType" name="type" class="form-select">
                        <option value="G">General (All ages)</option>
                        <option value="A">Adult (18+)</option>
                        <option value="R">Restricted (Private)</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Room Settings -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Room Settings</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="roomVoice" class="form-label">Voice Enabled</label>
                    <select id="roomVoice" name="voice" class="form-select">
                        <option value="1">Yes (Voice chat enabled)</option>
                        <option value="0">No (Text only)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="roomPrivate" class="form-label">Privacy Level</label>
                    <select id="roomPrivate" name="private" class="form-select">
                        <option value="0">Public (Everyone can join)</option>
                        <option value="1">Private (Invite only)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="roomLocked" class="form-label">Room Status</label>
                    <select id="roomLocked" name="locked" class="form-select">
                        <option value="0">Open (Unlocked)</option>
                        <option value="1">Locked (Password required)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="roomClosed" class="form-label">Availability</label>
                    <select id="roomClosed" name="closed" class="form-select">
                        <option value="0">Active (Open for use)</option>
                        <option value="1">Closed (Temporarily disabled)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="roomPassword" class="form-label">Password (optional)</label>
                <input type="text" id="roomPassword" name="password" class="form-input" placeholder="Enter room password" maxlength="20">
                <p class="mt-1 text-sm text-gray-500">Leave empty if no password is required. Only used when room is locked.</p>
            </div>
        </div>
        
        <!-- Advanced Settings -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="roomMike" class="form-label">Microphone Access</label>
                    <select id="roomMike" name="mike" class="form-select">
                        <option value="1">Open (Anyone can speak)</option>
                        <option value="0">Controlled (Admin only)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="roomText" class="form-label">Text Chat</label>
                    <select id="roomText" name="text" class="form-select">
                        <option value="1">Enabled</option>
                        <option value="0">Disabled</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="roomColor" class="form-label">Room Color</label>
                <select id="roomColor" name="color" class="form-select">
                    <option value="000000000">Default (Black)</option>
                    <option value="000000255">Blue</option>
                    <option value="000128000">Green</option>
                    <option value="255000000">Red</option>
                    <option value="128064128">Purple</option>
                    <option value="255128000">Orange</option>
                </select>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
            <a href="{{ route('admin.rooms') }}" class="btn-secondary">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cancel
            </a>
            <button type="submit" class="btn-primary">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Save Changes
            </button>
        </div>
    </form>
</div>

<!-- Error State -->
<div id="errorState" class="form-card p-6" style="display: none;">
    <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Error Loading Room</h3>
        <p class="mt-1 text-sm text-gray-500" id="errorMessage">Room not found or access denied.</p>
        <div class="mt-6">
            <a href="{{ route('admin.rooms') }}" class="btn-secondary">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m0 7h18"></path>
                </svg>
                Back to Rooms
            </a>
        </div>
    </div>
</div>
@endsection

@section('scripts')
const roomId = {{ $id }};
let roomData = null;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load room data
async function loadRoom() {
    try {
        const response = await fetch(`/api/admin/rooms`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const room = data.rooms.find(r => {
                const id = r.id || r.room_id;
                return id == roomId;
            });
            
            if (room) {
                roomData = room;
                populateForm(room);
                showRoomForm();
            } else {
                showError('Room not found.');
            }
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading room:', error);
        showError('Failed to load room data. Please try again.');
    }
}

// Populate form with room data
function populateForm(room) {
    document.getElementById('roomName').value = room.nm || room.name || '';
    document.getElementById('roomTopic').value = room.topic || '';
    document.getElementById('roomCategory').value = room.catg || room.category || '30028';
    document.getElementById('roomType').value = room.r || room.type || 'G';
    document.getElementById('roomVoice').value = room.v || room.voice || '1';
    document.getElementById('roomPrivate').value = room.p || room.private || '0';
    document.getElementById('roomLocked').value = room.l || room.locked || '0';
    document.getElementById('roomClosed').value = room.isClosed || room.closed || '0';
    document.getElementById('roomPassword').value = room.password || '';
    document.getElementById('roomMike').value = room.mike || '1';
    document.getElementById('roomText').value = room.text || '1';
    document.getElementById('roomColor').value = room.c || room.color || '000000000';
    
    // Update status indicator
    updateStatusIndicator(room);
}

// Update status indicator
function updateStatusIndicator(room) {
    const statusIndicator = document.getElementById('roomStatus');
    const statusText = document.getElementById('statusText');
    
    const isClosed = room.isClosed || room.closed;
    const isLocked = room.l || room.locked;
    
    if (isClosed) {
        statusIndicator.className = 'status-indicator closed';
        statusText.textContent = 'Closed';
    } else if (isLocked) {
        statusIndicator.className = 'status-indicator locked';
        statusText.textContent = 'Locked';
    } else {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Active';
    }
}

// Show room form
function showRoomForm() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('roomForm').style.display = 'block';
}

// Show error state
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('roomForm').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
}

// Handle form submission
document.getElementById('editForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner"></div>Saving...';
    
    const formData = {
        name: document.getElementById('roomName').value,
        topic: document.getElementById('roomTopic').value,
        category: parseInt(document.getElementById('roomCategory').value),
        type: document.getElementById('roomType').value,
        voice: parseInt(document.getElementById('roomVoice').value),
        private: parseInt(document.getElementById('roomPrivate').value),
        locked: parseInt(document.getElementById('roomLocked').value),
        closed: parseInt(document.getElementById('roomClosed').value),
        password: document.getElementById('roomPassword').value,
        mike: parseInt(document.getElementById('roomMike').value),
        text: parseInt(document.getElementById('roomText').value),
        color: document.getElementById('roomColor').value
    };
    
    try {
        const response = await fetch(`/api/admin/rooms/${roomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Room updated successfully!', 'success');
            // Redirect back to rooms list after a short delay
            setTimeout(() => {
                window.location.href = '{{ route("admin.rooms") }}';
            }, 1500);
        } else {
            console.error('Update failed:', data);
            showToast(data.message || data.error || 'Failed to update room', 'error');
        }
    } catch (error) {
        console.error('Error updating room:', error);
        showToast('Error updating room. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Update status indicator when room status changes
document.getElementById('roomClosed').addEventListener('change', updateStatusFromForm);
document.getElementById('roomLocked').addEventListener('change', updateStatusFromForm);

function updateStatusFromForm() {
    const isClosed = document.getElementById('roomClosed').value === '1';
    const isLocked = document.getElementById('roomLocked').value === '1';
    
    const statusIndicator = document.getElementById('roomStatus');
    const statusText = document.getElementById('statusText');
    
    if (isClosed) {
        statusIndicator.className = 'status-indicator closed';
        statusText.textContent = 'Closed';
    } else if (isLocked) {
        statusIndicator.className = 'status-indicator locked';
        statusText.textContent = 'Locked';
    } else {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Active';
    }
}

// Load room data when page loads
document.addEventListener('DOMContentLoaded', loadRoom);
@endsection