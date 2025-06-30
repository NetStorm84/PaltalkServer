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
$nickname = trim($input['nickname'] ?? '');

if (empty($nickname)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nickname required']);
    exit;
}

try {
    $dbPath = __DIR__ . '/../database.db';
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('SELECT id FROM users WHERE nickname = ? COLLATE NOCASE');
    $stmt->execute([$nickname]);
    
    $exists = $stmt->fetch() !== false;
    echo json_encode(['exists' => $exists]);
    
} catch (PDOException $e) {
    error_log("Nickname check error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
?>