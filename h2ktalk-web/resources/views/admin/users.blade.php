@extends('layouts.admin')

@section('title', 'User Management - h2ktalk.fun Admin')

@section('styles')
/* Modern table styles */
.users-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.users-table th {
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

.users-table td {
    padding: 16px;
    border-bottom: 1px solid #f3f4f6;
    color: #111827;
    font-size: 0.875rem;
}

.users-table tbody tr:hover {
    background: #f9fafb;
}

.users-table tbody tr:last-child td {
    border-bottom: none;
}

.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-details {
    min-width: 0;
    flex: 1;
}

.user-name {
    font-weight: 600;
    color: #111827;
    margin-bottom: 2px;
}

.user-email {
    font-size: 0.75rem;
    color: #6b7280;
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

.admin-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: #fef3c7;
    color: #92400e;
}

.admin-badge.level-0 {
    background: #f3f4f6;
    color: #6b7280;
}

.admin-badge.level-1 {
    background: #dbeafe;
    color: #1e40af;
}

.admin-badge.level-2 {
    background: #fef3c7;
    color: #92400e;
}

.admin-badge.level-3,
.admin-badge.level-4 {
    background: #fecaca;
    color: #991b1b;
}

.paid-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.paid-badge.free {
    background: #f3f4f6;
    color: #6b7280;
}

.paid-badge.basic {
    background: #dbeafe;
    color: #1e40af;
}

.paid-badge.premium {
    background: #dcfce7;
    color: #166534;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
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
}

.btn-edit {
    background: #dbeafe;
    color: #1e40af;
}

.btn-edit:hover {
    background: #bfdbfe;
}

.btn-delete {
    background: #fecaca;
    color: #991b1b;
}

.btn-delete:hover {
    background: #fca5a5;
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
.no-users {
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

@media (max-width: 768px) {
    .search-box {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .search-input {
        max-width: none;
    }
    
    .users-table {
        font-size: 0.8rem;
    }
    
    .user-info {
        gap: 8px;
    }
    
    .user-avatar {
        width: 28px;
        height: 28px;
        font-size: 0.75rem;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 2px;
    }
}

@media (max-width: 480px) {
    .users-table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
    }
}
@endsection

@section('content')
<!-- Page Header -->
<div class="mb-8">
    <div class="md:flex md:items-center md:justify-between">
        <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                User Management
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                Manage user accounts, permissions, and settings.
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

<!-- Users Table Card -->
<div class="bg-white shadow rounded-lg">
    <!-- Card Header -->
    <div class="px-4 py-5 sm:p-6 border-b border-gray-200">
        <div class="md:flex md:items-center md:justify-between">
            <div class="min-w-0 flex-1">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Registered Users</h3>
                <p class="mt-1 text-sm text-gray-500">A list of all users in the system with their details and status.</p>
            </div>
            <div class="mt-4 md:ml-4 md:mt-0">
                <div class="search-box">
                    <input type="text" 
                           id="searchInput" 
                           class="search-input" 
                           placeholder="Search users..." 
                           maxlength="50">
                    <button class="search-btn" onclick="searchUsers()">
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
    <div id="usersContent" class="loading-text">
        <div class="flex items-center justify-center py-12">
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="text-gray-500">Loading users...</span>
            </div>
        </div>
    </div>
</div>

@endsection

@section('scripts')
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

// Check if user is logged in
if (!adminToken) {
    window.location.href = '{{ route("admin.login") }}';
}

// Load all users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            allUsers = data.users || [];
            filteredUsers = [...allUsers];
            renderUsers();
        } else if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '{{ route("admin.login") }}';
        } else {
            throw new Error(`Failed to load users: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersContent').innerHTML = 
            '<div class="no-users">Error loading users. Please refresh the page.</div>';
    }
}

// Render users table
function renderUsers() {
    const usersContent = document.getElementById('usersContent');
    
    if (filteredUsers.length === 0) {
        usersContent.innerHTML = '<div class="no-users">No users found matching your search criteria.</div>';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Generate table HTML
    let tableHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Admin Level</th>
                    <th>Paid Status</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    currentUsers.forEach(user => {
        const userId = user.id || user.uid;
        const firstName = user.first || user.first_name || '';
        const lastName = user.last || user.last_name || '';
        const email = user.email || 'No email';
        const nickname = user.nickname || 'Unknown';
        const fullName = `${firstName} ${lastName}`.trim() || nickname;
        
        // Generate avatar initials
        const initials = nickname.charAt(0).toUpperCase();
        
        const adminBadge = getAdminBadge(user.admin || 0);
        const paidBadge = getPaidBadge(user.paid1 || 0);
        const statusBadge = getStatusBadge(user.is_active);
        
        const createdDate = new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        tableHTML += `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <div class="user-name">${escapeHtml(nickname)}</div>
                            <div class="user-email">${escapeHtml(email)}</div>
                        </div>
                    </div>
                </td>
                <td>${adminBadge}</td>
                <td>${paidBadge}</td>
                <td>${statusBadge}</td>
                <td><span class="text-sm text-gray-500">${createdDate}</span></td>
                <td>
                    <div class="action-buttons">
                        <a href="/admin/users/${userId}/edit" class="action-btn btn-edit">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            Edit
                        </a>
                        <button class="action-btn btn-delete" onclick="deleteUser(${userId}, '${escapeHtml(nickname)}')">
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
    
    usersContent.innerHTML = tableHTML;
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => {
            const nickname = (user.nickname || '').toLowerCase();
            const first = (user.first || user.first_name || '').toLowerCase();
            const last = (user.last || user.last_name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            
            return nickname.includes(searchTerm) ||
                   first.includes(searchTerm) ||
                   last.includes(searchTerm) ||
                   email.includes(searchTerm);
        });
    }
    
    currentPage = 1;
    renderUsers();
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderUsers();
    }
}

// Get admin badge
function getAdminBadge(adminLevel) {
    const level = parseInt(adminLevel);
    switch(level) {
        case 0:
            return '<span class="admin-badge level-0">User</span>';
        case 1:
            return '<span class="admin-badge level-1">Moderator</span>';
        case 2:
            return '<span class="admin-badge level-2">Admin</span>';
        case 3:
            return '<span class="admin-badge level-3">Super Admin</span>';
        case 4:
            return '<span class="admin-badge level-4">Owner</span>';
        default:
            return '<span class="admin-badge level-0">User</span>';
    }
}

// Get paid status badge
function getPaidBadge(paidLevel) {
    switch(parseInt(paidLevel)) {
        case 0:
            return '<span class="paid-badge free">Free</span>';
        case 1:
            return '<span class="paid-badge basic">Plus</span>';
        case 6:
            return '<span class="paid-badge premium">Extreme</span>';
        default:
            return '<span class="paid-badge free">Free</span>';
    }
}

// Get status badge
function getStatusBadge(isActive) {
    return isActive ? 
        '<span class="status-badge active">Active</span>' : 
        '<span class="status-badge inactive">Inactive</span>';
}

// Edit user - now redirects to separate page
function editUser(userId) {
    window.location.href = `/admin/users/${userId}/edit`;
}

// Delete user
async function deleteUser(userId, nickname) {
    if (!confirm(`Are you sure you want to delete user "${nickname}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('User deleted successfully', 'success');
            loadUsers(); // Reload the users list
        } else {
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user. Please try again.', 'error');
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
        searchUsers();
    }
});

// Load users when page loads
document.addEventListener('DOMContentLoaded', loadUsers);
@endsection