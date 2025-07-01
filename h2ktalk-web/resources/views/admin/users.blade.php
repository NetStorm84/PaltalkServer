@extends('layouts.app')

@section('title', 'User Management - h2ktalk.fun Admin')

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

.back-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
}

.users-section {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 1.5rem;
}

.users-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.users-header h2 {
    color: #ffffff;
    font-size: 1.3rem;
}

.search-box {
    display: flex;
    gap: 0.5rem;
}

.search-box input {
    padding: 8px 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
}

.search-box input:focus {
    outline: none;
    border-color: #ff4500;
}

.search-box input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.users-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
}

.users-table th,
.users-table td {
    padding: 12px 8px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.users-table th {
    background: rgba(255, 255, 255, 0.05);
    color: #ff4500;
    font-weight: bold;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.users-table td {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.85rem;
}

.user-nickname {
    font-weight: bold;
    color: #ffffff;
}

.admin-badge {
    background: #ff4500;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
}

.status-active {
    color: #4ade80;
}

.status-inactive {
    color: #ef4444;
}

.user-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn {
    padding: 4px 8px;
    border: 1px solid;
    border-radius: 3px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-edit {
    color: #3b82f6;
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
}

.btn-edit:hover {
    background: rgba(59, 130, 246, 0.2);
}

.btn-delete {
    color: #ef4444;
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
}

.btn-delete:hover {
    background: rgba(239, 68, 68, 0.2);
}

.pagination {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
}

.pagination button {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    cursor: pointer;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
}

.pagination button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination .active {
    background: #ff4500;
    border-color: #ff4500;
}

.loading-text {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    padding: 2rem;
}

.no-users {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    padding: 2rem;
}

@media (max-width: 768px) {
    .admin-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .users-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .search-box {
        justify-content: center;
    }
    
    .users-table {
        font-size: 0.8rem;
    }
    
    .users-table th,
    .users-table td {
        padding: 8px 4px;
    }
    
    .user-actions {
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
<div class="admin-header">
    <h1>👥 User Management</h1>
    <a href="{{ route('admin.dashboard') }}" class="btn back-btn">← Back to Dashboard</a>
</div>

<div class="users-section">
    <div class="users-header">
        <h2>Registered Users</h2>
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search users..." maxlength="50">
            <button class="btn btn-primary" onclick="searchUsers()">Search</button>
        </div>
    </div>
    
    <div id="usersContent" class="loading-text">
        Loading users...
    </div>
</div>
@endsection

@section('scripts')
let adminToken = localStorage.getItem('admin_token');
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
                'X-CSRF-TOKEN': token
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
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersContent').innerHTML = 
            '<div class="no-users">Error loading users. Please try again.</div>';
    }
}

// Render users table
function renderUsers() {
    const usersContent = document.getElementById('usersContent');
    
    if (filteredUsers.length === 0) {
        usersContent.innerHTML = '<div class="no-users">No users found.</div>';
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
                    <th>ID</th>
                    <th>Nickname</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Admin Level</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    currentUsers.forEach(user => {
        const adminBadge = user.admin > 0 ? 
            `<span class="admin-badge">Level ${user.admin}</span>` : 
            '<span style="color: rgba(255,255,255,0.5);">User</span>';
            
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        
        const createdDate = new Date(user.created_at).toLocaleDateString();
        
        tableHTML += `
            <tr>
                <td>${user.uid || user.id}</td>
                <td class="user-nickname">${escapeHtml(user.nickname)}</td>
                <td>${escapeHtml(user.first || '')} ${escapeHtml(user.last || '')}</td>
                <td>${escapeHtml(user.email || 'N/A')}</td>
                <td>${adminBadge}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${createdDate}</td>
                <td class="user-actions">
                    <button class="action-btn btn-edit" onclick="editUser(${user.uid || user.id})">Edit</button>
                    <button class="action-btn btn-delete" onclick="deleteUser(${user.uid || user.id}, '${escapeHtml(user.nickname)}')">Delete</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    
    // Add pagination
    if (totalPages > 1) {
        tableHTML += '<div class="pagination">';
        
        // Previous button
        tableHTML += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            tableHTML += `<button class="${activeClass}" onclick="changePage(${i})">${i}</button>`;
        }
        
        // Next button
        tableHTML += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
        
        tableHTML += '</div>';
    }
    
    usersContent.innerHTML = tableHTML;
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => 
            user.nickname.toLowerCase().includes(searchTerm) ||
            (user.first && user.first.toLowerCase().includes(searchTerm)) ||
            (user.last && user.last.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
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

// Edit user (placeholder)
function editUser(userId) {
    alert(`Edit user functionality for user ID ${userId} - Coming soon!`);
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
                'X-CSRF-TOKEN': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('User deleted successfully');
            loadUsers(); // Reload the users list
        } else {
            alert(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
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