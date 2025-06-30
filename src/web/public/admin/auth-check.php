<?php
// Authentication middleware for admin pages
function requireAuth() {
    session_start();
    
    if (!isset($_SESSION['admin_user'])) {
        header('Location: /admin/login.html');
        exit;
    }
    
    return $_SESSION['admin_user'];
}

function requireAdmin() {
    $user = requireAuth();
    
    if ($user['admin'] < 2) {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }
    
    return $user;
}

function isLoggedIn() {
    session_start();
    return isset($_SESSION['admin_user']);
}
?>