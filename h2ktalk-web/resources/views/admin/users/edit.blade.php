@extends('layouts.admin')

@section('title', 'Edit User - h2ktalk.fun Admin')

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

.status-indicator.inactive {
    background: #fef2f2;
    color: #991b1b;
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
                            <a href="{{ route('admin.users') }}" class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">Users</a>
                        </div>
                    </li>
                    <li>
                        <div class="flex items-center">
                            <svg class="h-5 w-5 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="ml-4 text-sm font-medium text-gray-500">Edit User</span>
                        </div>
                    </li>
                </ol>
            </nav>
            <h1 class="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Edit User
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Update user information, permissions, and settings.
            </p>
        </div>
    </div>
</div>

<!-- Loading State -->
<div id="loadingState" class="form-card p-6">
    <div class="flex items-center justify-center py-12">
        <div class="flex items-center space-x-2">
            <div class="loading-spinner"></div>
            <span class="text-gray-500">Loading user data...</span>
        </div>
    </div>
</div>

<!-- User Form -->
<div id="userForm" class="form-card p-6" style="display: none;">
    <!-- User Status Indicator -->
    <div id="userStatus" class="status-indicator active">
        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        User Status: <span id="statusText">Active</span>
    </div>

    <form id="editForm">
        <!-- Basic Information -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="firstName" class="form-label">First Name</label>
                    <input type="text" id="firstName" name="first_name" class="form-input" placeholder="Enter first name">
                </div>
                
                <div class="form-group">
                    <label for="lastName" class="form-label">Last Name</label>
                    <input type="text" id="lastName" name="last_name" class="form-input" placeholder="Enter last name">
                </div>
            </div>
            
            <div class="form-group">
                <label for="nickname" class="form-label">Nickname <span class="text-red-500">*</span></label>
                <input type="text" id="nickname" name="nickname" class="form-input" placeholder="Enter nickname" required>
            </div>
            
            <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" name="email" class="form-input" placeholder="Enter email address">
            </div>
        </div>
        
        <!-- Permissions & Status -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Permissions & Status</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="adminLevel" class="form-label">Admin Level</label>
                    <select id="adminLevel" name="admin" class="form-select">
                        <option value="0">User (Level 0)</option>
                        <option value="1">Moderator (Level 1)</option>
                        <option value="2">Admin (Level 2)</option>
                        <option value="3">Super Admin (Level 3)</option>
                        <option value="4">Owner (Level 4)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="accountStatus" class="form-label">Account Status</label>
                    <select id="accountStatus" name="is_active" class="form-select">
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- Chat Settings -->
        <div class="mb-8">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Chat Settings</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="paidStatus" class="form-label">Paid Status</label>
                    <select id="paidStatus" name="paid1" class="form-select">
                        <option value="0">Free (0)</option>
                        <option value="1">Plus (1)</option>
                        <option value="6">Extreme (6)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="userColor" class="form-label">User Color</label>
                    <select id="userColor" name="color" class="form-select">
                        <option value="000000000">Default (Black)</option>
                        <option value="000000255">Blue</option>
                        <option value="000128000">Green</option>
                        <option value="255000000">Red</option>
                        <option value="128064128">Purple (Light)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="banners" class="form-label">Show Banners/Ads</label>
                <select id="banners" name="banners" class="form-select">
                    <option value="yes">Yes (Show ads)</option>
                    <option value="no">No (Hide ads)</option>
                </select>
                <p class="mt-1 text-sm text-gray-500">Whether this user will see advertisements in the chat client.</p>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
            <a href="{{ route('admin.users') }}" class="btn-secondary">
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
        <h3 class="mt-2 text-sm font-medium text-gray-900">Error Loading User</h3>
        <p class="mt-1 text-sm text-gray-500" id="errorMessage">User not found or access denied.</p>
        <div class="mt-6">
            <a href="{{ route('admin.users') }}" class="btn-secondary">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m0 7h18"></path>
                </svg>
                Back to Users
            </a>
        </div>
    </div>
</div>
@endsection

@section('scripts')
const userId = {{ $id }};
let userData = null;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load user data
async function loadUser() {
    try {
        const response = await fetch(`/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.users.find(u => {
                const id = u.uid || u.id;
                return id == userId;
            });
            
            if (user) {
                userData = user;
                populateForm(user);
                showUserForm();
            } else {
                showError('User not found.');
            }
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showError('Failed to load user data. Please try again.');
    }
}

// Populate form with user data
function populateForm(user) {
    document.getElementById('firstName').value = user.first || user.first_name || '';
    document.getElementById('lastName').value = user.last || user.last_name || '';
    document.getElementById('nickname').value = user.nickname || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('adminLevel').value = user.admin || 0;
    document.getElementById('accountStatus').value = user.is_active ? 1 : 0;
    document.getElementById('paidStatus').value = user.paid1 || 0;
    document.getElementById('userColor').value = user.color || '000000000';
    document.getElementById('banners').value = user.banners || 'yes';
    
    // Update status indicator
    const statusIndicator = document.getElementById('userStatus');
    const statusText = document.getElementById('statusText');
    
    if (user.is_active) {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Active';
    } else {
        statusIndicator.className = 'status-indicator inactive';
        statusText.textContent = 'Inactive';
    }
}

// Show user form
function showUserForm() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('userForm').style.display = 'block';
}

// Show error state
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('userForm').style.display = 'none';
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
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        nickname: document.getElementById('nickname').value,
        email: document.getElementById('email').value,
        admin: parseInt(document.getElementById('adminLevel').value),
        is_active: parseInt(document.getElementById('accountStatus').value),
        paid1: parseInt(document.getElementById('paidStatus').value),
        color: document.getElementById('userColor').value,
        banners: document.getElementById('banners').value
    };
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
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
            showToast('User updated successfully!', 'success');
            // Redirect back to users list after a short delay
            setTimeout(() => {
                window.location.href = '{{ route("admin.users") }}';
            }, 1500);
        } else {
            console.error('Update failed:', data);
            showToast(data.message || data.error || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error updating user. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Update status indicator when account status changes
document.getElementById('accountStatus').addEventListener('change', function() {
    const statusIndicator = document.getElementById('userStatus');
    const statusText = document.getElementById('statusText');
    
    if (this.value === '1') {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'Active';
    } else {
        statusIndicator.className = 'status-indicator inactive';
        statusText.textContent = 'Inactive';
    }
});

// Load user data when page loads
document.addEventListener('DOMContentLoaded', loadUser);
@endsection