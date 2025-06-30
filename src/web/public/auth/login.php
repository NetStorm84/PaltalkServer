<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit;
}

try {
    // Check hardcoded admin first
    if ($username === 'admin' && $password === 'password123') {
        $_SESSION['admin_user'] = [
            'id' => 0,
            'username' => 'admin',
            'nickname' => 'Dashboard Admin',
            'admin' => 3
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'username' => 'admin',
                'nickname' => 'Dashboard Admin',
                'admin' => 3
            ]
        ]);
        exit;
    }
    
    // Check database users
    $dbPath = __DIR__ . '/../database.db';
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('SELECT id, nickname, password, admin FROM users WHERE nickname = ? COLLATE NOCASE');
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    if ($user['admin'] < 2) {
        http_response_code(403);
        echo json_encode(['error' => 'Admin access required']);
        exit;
    }
    
    $_SESSION['admin_user'] = [
        'id' => $user['id'],
        'username' => $user['nickname'],
        'nickname' => $user['nickname'],
        'admin' => $user['admin']
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'username' => $user['nickname'],
            'nickname' => $user['nickname'],
            'admin' => $user['admin']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Login failed']);
}
?>