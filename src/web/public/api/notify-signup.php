<?php
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
$email = trim($input['email'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid email required']);
    exit;
}

try {
    $dbPath = __DIR__ . '/../database.db';
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    $stmt = $pdo->prepare('INSERT INTO email_notifications (email, ip_address, user_agent) VALUES (?, ?, ?)');
    $stmt->execute([$email, $ip, $userAgent]);
    
    echo json_encode(['success' => true, 'message' => 'Email notification signup successful']);
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
        http_response_code(400);
        echo json_encode(['error' => 'Email already registered for notifications']);
    } else {
        error_log("Email signup error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Signup failed']);
    }
}
?>