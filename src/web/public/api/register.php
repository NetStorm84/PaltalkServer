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

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$first = trim($input['first'] ?? '');
$last = trim($input['last'] ?? '');
$nickname = trim($input['nickname'] ?? '');
$password = $input['password'] ?? '';

// Validation
if (empty($first) || empty($last) || empty($nickname) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

if (strlen($nickname) < 5) {
    http_response_code(400);
    echo json_encode(['error' => 'Nickname must be at least 5 characters long']);
    exit;
}

// Check blacklisted words
$blacklistedWords = ['admin', 'co-admin', 'coadmin', 'paltalk', 'support', 'palsupport'];
$nicknameLower = strtolower($nickname);

foreach ($blacklistedWords as $word) {
    if (strpos($nicknameLower, $word) !== false) {
        http_response_code(400);
        echo json_encode(['error' => "Nickname cannot contain the word \"$word\""]);
        exit;
    }
}

// Check for brackets
if (strpos($nickname, '(') !== false || strpos($nickname, ')') !== false) {
    http_response_code(400);
    echo json_encode(['error' => 'Nickname cannot contain brackets ( )']);
    exit;
}

try {
    // Connect to database
    $dbPath = __DIR__ . '/../database.db';
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if nickname exists
    $stmt = $pdo->prepare('SELECT id FROM users WHERE nickname = ? COLLATE NOCASE');
    $stmt->execute([$nickname]);
    
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Nickname already exists']);
        exit;
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert user
    $stmt = $pdo->prepare('INSERT INTO users (first, last, nickname, password) VALUES (?, ?, ?, ?)');
    $stmt->execute([$first, $last, $nickname, $hashedPassword]);
    
    echo json_encode(['success' => true, 'message' => 'Registration successful']);
    
} catch (PDOException $e) {
    error_log("Registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed']);
}
?>